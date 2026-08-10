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
The system SHALL allow authenticated users to find clients using a case-insensitive basic search over name, email, phone, and organization and to filter records by organization when present. Valid search requests SHALL complete without an internal server error in supported application environments. While a search is pending, the search control SHALL remain operable and the interface SHALL preserve stable content until results for the latest term are available.

#### Scenario: Search clients
- **WHEN** an authenticated user enters a valid search term
- **THEN** the client list shows matching records according to the normalized prefix-search strategy, ordered by most recently updated, without treating the request as an internal error

#### Scenario: Continue typing while search is pending
- **WHEN** a client search request is in progress and the user types another character
- **THEN** the search field remains focused and accepts the character without being replaced by a blocking loading state

#### Scenario: Rapidly enter a search term
- **WHEN** the user types multiple characters without pausing
- **THEN** the system waits for a brief pause before requesting results for the latest complete term

#### Scenario: Display search progress
- **WHEN** a search request is pending after the typing pause
- **THEN** the interface keeps the current results visible and exposes non-blocking search progress without moving focus from the search field

#### Scenario: Older search finishes after newer search
- **WHEN** responses for multiple search terms finish out of order
- **THEN** the client list displays results for the latest entered term and ignores older results

#### Scenario: No clients match
- **WHEN** the active search and filters match no records
- **THEN** the client list displays an empty result without treating it as an error

#### Scenario: Filter clients by organization
- **WHEN** an authenticated user filters clients by an organization that exists
- **THEN** the client list returns records for that organization in the established list order

### Requirement: Client list presentation modes
The system SHALL allow authenticated users to present the current client result set as cards or as a semantic table while preserving the same client records and available actions.

#### Scenario: Open the client list
- **WHEN** an authenticated user opens the Clients view
- **THEN** the current client result set is displayed in table mode by default and both presentation choices are available

#### Scenario: Switch clients to card mode
- **WHEN** the user selects card mode while a client search is active
- **THEN** the same searched client result set is displayed as cards without clearing the search term or starting a replacement search solely because of the view change

#### Scenario: Use client actions in table mode
- **WHEN** the user edits or starts deleting a client from a table row
- **THEN** the system preserves the existing edit behavior, accessible action names, and deletion confirmation workflow

#### Scenario: View the client table on a narrow screen
- **WHEN** the client table is wider than its available list surface
- **THEN** the table can scroll horizontally within that surface without causing horizontal overflow for the application page

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

### Requirement: Organization-scoped client management
The system SHALL create, retrieve, list, search, update, and delete clients only within the authenticated caller's authorized organization. Client identifiers from another organization SHALL NOT grant access or affect deletion-integrity decisions in the caller's organization.

#### Scenario: Create an organization client
- **WHEN** an authorized organization member submits valid client data
- **THEN** the system stores the client within that organization and does not expose it to members of other organizations

#### Scenario: Search organization clients
- **WHEN** an authorized organization member searches or filters clients
- **THEN** the system evaluates the search only against clients in that organization

#### Scenario: Request a foreign client identifier
- **WHEN** an authorized organization member requests a client identifier that exists only in another organization
- **THEN** the system returns a not-found response and reveals no foreign client data

#### Scenario: Delete a client with same-organization work orders
- **WHEN** an authorized organization member attempts to delete a client referenced by a work order in the same organization
- **THEN** the system rejects deletion with the established conflict response
