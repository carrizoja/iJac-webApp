## Purpose

Define authenticated client record management, discovery, validation, and deletion behavior.

## Requirements

### Requirement: Client record model
The system SHALL persist each client with a name, email, phone, optional company or organization, optional notes, and server-managed creation and update timestamps.

#### Scenario: Create a valid client
- **WHEN** an authenticated user submits a client with all required fields and valid contact values
- **THEN** the system stores the client with a generated identifier and server-generated `createdAt` and `updatedAt` values

#### Scenario: Submit invalid client data
- **WHEN** an authenticated user submits a missing name or malformed contact value
- **THEN** the system rejects the request with field-level validation details and stores no client

### Requirement: Client retrieval and listing
The system SHALL allow authenticated users to retrieve an individual client and a paginated client list ordered predictably.

#### Scenario: List clients
- **WHEN** an authenticated user opens the clients view
- **THEN** the system returns a page of clients ordered by most recently updated, with pagination metadata or a continuation cursor

#### Scenario: Retrieve an unknown client
- **WHEN** an authenticated user requests a client identifier that does not exist
- **THEN** the system returns a not-found response

### Requirement: Client search and filtering
The system SHALL allow authenticated users to find clients using a case-insensitive basic search over name, email, phone, and organization and to filter records by organization when present.

#### Scenario: Search clients
- **WHEN** an authenticated user enters a search term
- **THEN** the client list shows records whose indexed searchable fields contain or prefix-match the normalized term according to the implemented basic-search strategy

#### Scenario: No clients match
- **WHEN** the active search and filters match no records
- **THEN** the client list displays an empty result without treating it as an error

### Requirement: Client update
The system SHALL allow authenticated users to update mutable client fields while preserving the original creation timestamp.

#### Scenario: Update a client
- **WHEN** an authenticated user submits valid changes for an existing client
- **THEN** the system persists the changes, preserves `createdAt`, and assigns a new server-managed `updatedAt`

### Requirement: Client deletion integrity
The system SHALL allow authenticated users to delete an unreferenced client and SHALL prevent deletion while any work order references that client.

#### Scenario: Delete an unreferenced client
- **WHEN** an authenticated user confirms deletion of a client with no linked work orders
- **THEN** the system deletes the client and it no longer appears in client results

#### Scenario: Delete a referenced client
- **WHEN** an authenticated user attempts to delete a client referenced by one or more work orders
- **THEN** the system rejects deletion with a conflict response that explains the dependency
