## Purpose

Lets organization admins take a complete, human-readable and machine-readable copy of their clients, work orders and payments out of the app.

## Requirements

### Requirement: Export is restricted to admins
The system SHALL allow only members with the `admin` role to download an export. Requests from members with any other role SHALL be refused, and requests without a valid session SHALL be rejected as unauthenticated.

#### Scenario: Admin downloads an export
- **WHEN** an admin requests `GET /api/export.xlsx` or `GET /api/export.json`
- **THEN** the system responds 200 with the export file

#### Scenario: Member is refused
- **WHEN** a member with the `member` role requests either export endpoint
- **THEN** the system responds 403 and returns no organization data

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without a valid token reaches either export endpoint
- **THEN** the system responds 401

### Requirement: Export contains only the caller's organization
The export SHALL contain every client, work order and payment of the caller's organization, and SHALL NOT contain data from any other organization.

#### Scenario: Other organizations are excluded
- **WHEN** an admin of organization A downloads an export while organization B also has records
- **THEN** the file contains all of A's clients, work orders and payments and none of B's

#### Scenario: Organization with no records
- **WHEN** an admin of an organization with no clients, work orders or payments downloads an export
- **THEN** the system responds 200 with an export whose collections are empty

### Requirement: Excel workbook layout
`GET /api/export.xlsx` SHALL return an `.xlsx` workbook with exactly three sheets named "Clientes", "Órdenes" and "Pagos", each with a header row followed by one row per record. The response SHALL be served as an attachment whose file name includes the export date.

#### Scenario: Sheets and headers
- **WHEN** an admin downloads the Excel export
- **THEN** the workbook has the sheets "Clientes", "Órdenes" and "Pagos" in that order, each starting with a header row

#### Scenario: Download file name
- **WHEN** an admin downloads the Excel export on 2026-11-12
- **THEN** the response has content type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a `Content-Disposition` attachment named `ijac-export-2026-11-12.xlsx`

### Requirement: Rows keep IDs and readable references
Each row SHALL include the record's own ID. Rows that reference another record SHALL include that record's ID and a readable column next to it: an order shows its client's ID and name, and a payment shows its order's ID and title and its client's name.

#### Scenario: Order references its client
- **WHEN** an order belongs to client `c1` named "Ana Pérez"
- **THEN** its row on "Órdenes" contains `c1` and "Ana Pérez"

#### Scenario: Payment references its order and client
- **WHEN** a payment belongs to order `o1` titled "Reparación techo" for client "Ana Pérez"
- **THEN** its row on "Pagos" contains `o1`, "Reparación techo" and "Ana Pérez"

#### Scenario: Referenced record no longer exists
- **WHEN** an order's client cannot be found
- **THEN** the row keeps the client ID and leaves the readable name empty, and the export still succeeds

### Requirement: Voided payments are included and marked
The export SHALL include voided payments. Each payment row SHALL show its status, and a voided payment SHALL also show when it was voided and the reason.

#### Scenario: Voided payment appears marked
- **WHEN** an organization has a voided payment with receipt number 12
- **THEN** the "Pagos" sheet has a row for receipt 12 with status "Anulado" and its void date and reason

### Requirement: Amounts and dates are typed cells
In the Excel workbook, amounts SHALL be numeric cells in major currency units with their currency shown, and dates SHALL be date cells, so they can be summed and sorted in a spreadsheet.

#### Scenario: Amount is numeric
- **WHEN** a payment has `amountMinor` 150050 in ARS
- **THEN** its amount cell holds the number 1500.50 and the row shows the currency ARS

### Requirement: JSON copy holds the same data
`GET /api/export.json` SHALL return a JSON document with the export date, the organization ID, a format version, and the arrays `clients`, `workOrders` and `payments`. Records SHALL keep all their stored fields, with amounts in minor units as stored, and the response SHALL be served as an attachment named with the export date.

#### Scenario: JSON structure
- **WHEN** an admin downloads the JSON export
- **THEN** the body has `formatVersion`, `exportedAt`, `organizationId`, `clients`, `workOrders` and `payments`

#### Scenario: Same records in both formats
- **WHEN** an admin downloads both exports with no changes in between
- **THEN** the JSON arrays and the Excel sheets contain the same records

### Requirement: Settings shows the export only to admins
The Settings page SHALL show a "Respaldo de datos" section with the buttons "Exportar a Excel" and "Descargar copia (JSON)" only to admins. Each button SHALL download its file, show that it is in progress while it downloads, and show an error message if the download fails.

#### Scenario: Admin sees the buttons
- **WHEN** an admin opens Settings
- **THEN** the "Respaldo de datos" section shows "Exportar a Excel" and "Descargar copia (JSON)"

#### Scenario: Member does not see the section
- **WHEN** a member opens Settings
- **THEN** the "Respaldo de datos" section is not shown

#### Scenario: Download fails
- **WHEN** an admin presses "Exportar a Excel" and the request fails
- **THEN** the section shows an error message and the button can be pressed again
