## MODIFIED Requirements

### Requirement: Client search and filtering
The system SHALL allow authenticated users to find clients using a case-insensitive basic search over name, email, phone, and organization and to filter records by organization when present. Valid search requests SHALL complete without an internal server error in supported application environments.

#### Scenario: Search clients
- **WHEN** an authenticated user enters a valid search term
- **THEN** the client list shows matching records according to the normalized prefix-search strategy, ordered by most recently updated, without treating the request as an internal error

#### Scenario: No clients match
- **WHEN** the active search and filters match no records
- **THEN** the client list displays an empty result without treating it as an error

#### Scenario: Filter clients by organization
- **WHEN** an authenticated user filters clients by an organization that exists
- **THEN** the client list returns records for that organization in the established list order
