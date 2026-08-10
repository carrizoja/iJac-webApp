## ADDED Requirements

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
