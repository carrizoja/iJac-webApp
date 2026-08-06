## ADDED Requirements

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
