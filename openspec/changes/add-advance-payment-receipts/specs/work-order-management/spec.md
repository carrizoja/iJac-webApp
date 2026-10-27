## MODIFIED Requirements

### Requirement: Work-order record model
The system SHALL persist each work order with a title, description, status, client identifier, priority, optional due date, optional total price, a currency of `ARS` or `USD` when a total price is present, and server-managed creation and update timestamps. The total price SHALL be stored as a non-negative integer number of minor currency units (cents).

#### Scenario: Create a valid work order
- **WHEN** an authenticated user submits valid work-order data linked to an existing client
- **THEN** the system stores the work order with a generated identifier and server-generated timestamps

#### Scenario: Link an unknown client
- **WHEN** an authenticated user submits a work order whose `clientId` does not identify an existing client
- **THEN** the system rejects the request and stores no work order

#### Scenario: Submit invalid status or priority
- **WHEN** an authenticated user submits a status or priority outside the shared allowed values
- **THEN** the system rejects the request with field-level validation details

#### Scenario: Create a priced work order
- **WHEN** an authenticated user submits a work order with a total price of 15000000 minor units and currency `ARS`
- **THEN** the system stores the work order with that total price and currency

#### Scenario: Submit a price without a currency
- **WHEN** an authenticated user submits a total price without a currency, a currency other than `ARS` or `USD`, or a negative or non-integer total price
- **THEN** the system rejects the request with field-level validation details and stores no change

#### Scenario: Create an unpriced work order
- **WHEN** an authenticated user submits a work order without a total price
- **THEN** the system stores the work order without a total price or currency

### Requirement: Work-order update
The system SHALL allow authenticated users to update mutable work-order fields while preserving the original creation timestamp and validating any changed client reference. When a work order has at least one active payment, the system SHALL reject a change of currency, SHALL reject removing the total price, and SHALL reject a total price lower than the sum of its active payments.

#### Scenario: Update a work order
- **WHEN** an authenticated user submits valid changes for an existing work order
- **THEN** the system persists the changes, preserves `createdAt`, and assigns a new server-managed `updatedAt`

#### Scenario: Change currency after a payment
- **WHEN** an authenticated user changes the currency of a work order that has an active payment
- **THEN** the system rejects the request with a conflict error and leaves the work order unchanged

#### Scenario: Lower the total below the paid amount
- **WHEN** an authenticated user sets the total price of a work order below the sum of its active payments
- **THEN** the system rejects the request with a conflict error and leaves the work order unchanged

#### Scenario: Raise the total after a payment
- **WHEN** an authenticated user raises the total price of a work order that has active payments
- **THEN** the system persists the new total and the remaining balance increases accordingly

#### Scenario: Change currency after all payments are voided
- **WHEN** an authenticated user changes the currency of a work order whose payments are all voided
- **THEN** the system persists the new currency
