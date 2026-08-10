## Purpose

Define authenticated work-order lifecycle management, filtering, and client relationships.

## Requirements

### Requirement: Work-order record model
The system SHALL persist each work order with a title, description, status, client identifier, priority, optional due date, and server-managed creation and update timestamps.

#### Scenario: Create a valid work order
- **WHEN** an authenticated user submits valid work-order data linked to an existing client
- **THEN** the system stores the work order with a generated identifier and server-generated timestamps

#### Scenario: Link an unknown client
- **WHEN** an authenticated user submits a work order whose `clientId` does not identify an existing client
- **THEN** the system rejects the request and stores no work order

#### Scenario: Submit invalid status or priority
- **WHEN** an authenticated user submits a status or priority outside the shared allowed values
- **THEN** the system rejects the request with field-level validation details

### Requirement: Work-order lifecycle values
The system SHALL support `open`, `in-progress`, `completed`, and `cancelled` statuses and SHALL support `low`, `normal`, `high`, and `urgent` priorities.

#### Scenario: Change work-order status
- **WHEN** an authenticated user changes a work order to any allowed status
- **THEN** the system persists the new status and updates the server-managed modification timestamp

### Requirement: Work-order retrieval and listing
The system SHALL allow authenticated users to retrieve an individual work order and a paginated work-order list, including enough client summary data to identify the linked client without copying mutable client contact data into the work order.

#### Scenario: List work orders
- **WHEN** an authenticated user opens the work-orders view
- **THEN** the system returns a predictably ordered page showing each work order and its linked client's display name

#### Scenario: Retrieve an unknown work order
- **WHEN** an authenticated user requests a work-order identifier that does not exist
- **THEN** the system returns a not-found response

### Requirement: Work-order filtering
The system SHALL allow authenticated users to filter work orders by status, priority, client, and due-date range.

#### Scenario: Apply multiple filters
- **WHEN** an authenticated user selects a status and client filter
- **THEN** the system returns only work orders satisfying both filters

### Requirement: Work-order list presentation modes
The system SHALL allow authenticated users to present the current work-order result set as cards or as a semantic table while preserving the same work-order details and available actions.

#### Scenario: Open the work-order list
- **WHEN** an authenticated user opens the Work Orders view
- **THEN** the current work-order result set is displayed in table mode by default and both presentation choices are available

#### Scenario: Switch work orders to card mode
- **WHEN** the user selects card mode while work-order filters are active
- **THEN** the same filtered result set is displayed as cards without clearing filters or requesting replacement data solely because of the view change

#### Scenario: Inspect work-order details in table mode
- **WHEN** work orders are displayed as a table
- **THEN** each row identifies the title, linked client, status, priority, optional due date, and available actions

#### Scenario: Use work-order actions in table mode
- **WHEN** the user edits or starts deleting a work order from a table row
- **THEN** the system preserves the existing edit behavior, accessible action names, and deletion confirmation workflow

#### Scenario: View the work-order table on a narrow screen
- **WHEN** the work-order table is wider than its available list surface
- **THEN** the table can scroll horizontally within that surface without causing horizontal overflow for the application page

### Requirement: Work-order update
The system SHALL allow authenticated users to update mutable work-order fields while preserving the original creation timestamp and validating any changed client reference.

#### Scenario: Update a work order
- **WHEN** an authenticated user submits valid changes for an existing work order
- **THEN** the system persists the changes, preserves `createdAt`, and assigns a new server-managed `updatedAt`

### Requirement: Work-order deletion
The system SHALL allow authenticated users to delete a work order and SHALL remove or cancel any application-managed Google Calendar event associated with it when Calendar authorization is available.

#### Scenario: Delete a work order without a calendar event
- **WHEN** an authenticated user confirms deletion of a work order with no synchronized event
- **THEN** the system deletes the work order and it no longer appears in work-order or calendar results

#### Scenario: Delete a synchronized work order
- **WHEN** an authenticated user confirms deletion of a work order with an application-managed Google Calendar event
- **THEN** the system removes the work order and attempts to remove the mapped external event while retaining enough failure state to retry if Google is unavailable

### Requirement: Organization-scoped work-order management
The system SHALL create, retrieve, list, filter, update, and delete work orders only within the authenticated caller's authorized organization. Every client relationship and client summary used by a work order SHALL resolve within that same organization.

#### Scenario: Create an order for an organization client
- **WHEN** an authorized organization member submits valid work-order data linked to a client in the same organization
- **THEN** the system creates the work order in that organization and transactionally updates that client's work-order count

#### Scenario: Link a client from another organization
- **WHEN** an authorized organization member submits a work order whose `clientId` exists only in another organization
- **THEN** the system returns a not-found response, creates no work order, and changes no client count

#### Scenario: List organization work orders
- **WHEN** an authorized organization member lists or filters work orders
- **THEN** the system returns only work orders in that organization with client summaries resolved from the same organization

#### Scenario: Reassign an order across organizations
- **WHEN** an authorized organization member attempts to reassign a work order to a client identifier that exists only in another organization
- **THEN** the system rejects the update and leaves the work order and both organizations' client counts unchanged

#### Scenario: Load organization work orders for calendar behavior
- **WHEN** the system retrieves work orders for an authorized member's calendar operation
- **THEN** it considers only work orders and client summaries from that member's authorized organization

### Requirement: Guided work-order form entry
The work-order form SHALL provide calendar-based due-date selection and SHALL require a valid status and priority before submitting a new or updated work order.

#### Scenario: Open the due-date calendar
- **WHEN** a user activates the due-date field or its calendar control
- **THEN** the form presents the browser-supported calendar picker and preserves keyboard-accessible date entry

#### Scenario: Submit without status or priority
- **WHEN** a user attempts to submit a work order without selecting a status or priority
- **THEN** the form identifies each missing required field and sends no request

#### Scenario: Submit required work-order choices
- **WHEN** a user selects a valid status and priority and completes the other required fields
- **THEN** the form submits the selected values using the established work-order API contract
