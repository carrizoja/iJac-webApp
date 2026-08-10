## MODIFIED Requirements

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
