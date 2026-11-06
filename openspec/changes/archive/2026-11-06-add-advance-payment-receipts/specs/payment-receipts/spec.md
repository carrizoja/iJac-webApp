## Purpose

Produce a printable, Spanish, non-fiscal receipt for each recorded payment so the organization can hand clients proof of an advance or final payment.

## ADDED Requirements

### Requirement: Receipt content
The receipt SHALL be rendered in Spanish regardless of the user's interface language and SHALL show: the issuer business name, CUIT, address, and phone; the receipt number in `0001-00000042` format; the payment date; the client name and, when present, the client tax identifier; the amount in figures with its currency; the amount in words; the payment method; the concept; the work-order title; and the label "Documento no válido como factura". All data SHALL come from the payment's issuance-time snapshots.

#### Scenario: Receipt for a client with a tax identifier
- **WHEN** a user opens the receipt of a payment whose client snapshot includes a tax identifier
- **THEN** the receipt shows the client name and tax identifier

#### Scenario: Receipt for a client without a tax identifier
- **WHEN** a user opens the receipt of a payment whose client snapshot has no tax identifier
- **THEN** the receipt omits the tax identifier line

#### Scenario: English interface
- **WHEN** a user whose interface language is English opens a receipt
- **THEN** the receipt content is in Spanish

### Requirement: Amount in words
The receipt SHALL state the amount in Spanish words, using "pesos" for `ARS` and "dólares estadounidenses" for `USD`, followed by "con XX/100" for the cents.

#### Scenario: ARS amount
- **WHEN** the payment amount is 15000000 minor units in `ARS`
- **THEN** the receipt reads "pesos ciento cincuenta mil con 00/100"

#### Scenario: USD amount with cents
- **WHEN** the payment amount is 125050 minor units in `USD`
- **THEN** the receipt reads "dólares estadounidenses mil doscientos cincuenta con 50/100"

#### Scenario: Amount of one million and one
- **WHEN** the payment amount is 100000100 minor units in `ARS`
- **THEN** the receipt reads "pesos un millón uno con 00/100"

### Requirement: Receipt concept
The receipt concept SHALL read "Anticipo" when a balance remained on the work order immediately after the payment was recorded, and "Cancelación de saldo" when the payment brought the remaining balance to zero. The concept SHALL be fixed at issuance.

#### Scenario: Partial payment
- **WHEN** a payment of 3000000 is recorded on a work order with a remaining balance of 15000000
- **THEN** its receipt concept is "Anticipo"

#### Scenario: Settling payment
- **WHEN** a payment equal to the remaining balance is recorded
- **THEN** its receipt concept is "Cancelación de saldo"

#### Scenario: Total raised after a settling payment
- **WHEN** the work-order total is raised after a "Cancelación de saldo" payment
- **THEN** that payment's receipt concept remains "Cancelación de saldo"

### Requirement: Receipt printing and reprinting
The web application SHALL let any active member of the organization open and print the receipt of any payment of their organization, using the browser print dialog, which also allows saving as PDF. Printing SHALL show only the receipt.

#### Scenario: Print a receipt
- **WHEN** a member opens a payment receipt and chooses print
- **THEN** the browser print dialog opens with only the receipt content

### Requirement: Voided receipt marking
A receipt for a voided payment SHALL remain viewable and printable and SHALL display a prominent "ANULADO" mark together with the void reason.

#### Scenario: Open a voided receipt
- **WHEN** a user opens the receipt of a voided payment
- **THEN** the receipt shows the "ANULADO" mark and the void reason

### Requirement: Receipt logo and signature
An admin SHALL be able to upload, replace, and remove an organization logo and a signature image, each a PNG or JPEG of at most 200 KB whose bytes match its declared type. The system SHALL store them with the organization, SHALL serve them only to authenticated members of that organization, and SHALL NOT publish them as public files. A receipt SHALL show the logo in its header and the signature above the "Firma y aclaración" line when they exist, using the images current at print time.

#### Scenario: Print a receipt with logo and signature
- **WHEN** the organization has a logo and a signature and a member opens a receipt
- **THEN** the receipt header shows the logo and the signature appears above "Firma y aclaración"

#### Scenario: Print the signatory name
- **WHEN** the organization profile has the optional signatory name "Ing. José Carrizo"
- **THEN** the receipt prints "Ing. José Carrizo" under the signature line instead of "Firma y aclaración", and prints "Firma y aclaración" when the name is blank

#### Scenario: Print a receipt without images
- **WHEN** the organization has no logo or signature
- **THEN** the receipt prints as before, with an empty signature line

#### Scenario: Reject an unsupported image
- **WHEN** an admin uploads an SVG, a file whose bytes are not a PNG or JPEG, or an image over 200 KB
- **THEN** the system rejects it and keeps the previous image

#### Scenario: Members cannot change the images
- **WHEN** a member who is not an admin tries to upload or remove a logo or signature
- **THEN** the system rejects the request with 403
