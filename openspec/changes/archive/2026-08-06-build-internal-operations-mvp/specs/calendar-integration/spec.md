## ADDED Requirements

### Requirement: Internal work-order calendar
The web application SHALL present work orders with due dates in an internal calendar and SHALL provide a way to open the corresponding work-order details.

#### Scenario: View a calendar period
- **WHEN** an authenticated user opens a calendar month or week
- **THEN** the calendar displays each non-cancelled work order due in that period with its title, status, and priority

#### Scenario: Work order has no due date
- **WHEN** a work order has no due date
- **THEN** it remains available in work-order views but does not appear as a dated calendar event

#### Scenario: Open a calendar item
- **WHEN** an authenticated user selects a work-order calendar item
- **THEN** the web application opens or links to the corresponding work-order details

### Requirement: Explicit Calendar connection state
The system SHALL show whether the authenticated user has usable Google Calendar authorization and SHALL provide a server-mediated flow to connect or reconnect it.

#### Scenario: Calendar is not connected
- **WHEN** an authenticated user without a usable refresh credential opens Calendar integration controls
- **THEN** the system displays a disconnected state and an action to complete Google consent

#### Scenario: Calendar is connected
- **WHEN** the API can refresh Google access for the authenticated user
- **THEN** the system displays the integration as connected without exposing OAuth credentials

### Requirement: One-way Google Calendar synchronization
For the MVP, the system SHALL synchronize application-managed, due-dated work orders from iJac to Google Calendar and SHALL NOT import arbitrary Google Calendar changes back into work orders.

#### Scenario: Synchronize a due-dated work order
- **WHEN** an authenticated user with connected Calendar authorization requests synchronization for an eligible work order
- **THEN** the system creates or updates one mapped Google Calendar event containing the work-order title, due date, and an application reference

#### Scenario: Synchronize the same work order repeatedly
- **WHEN** synchronization runs more than once without deleting the mapping
- **THEN** the system updates the previously mapped event instead of creating duplicates

#### Scenario: Google event changes externally
- **WHEN** an application-managed event is edited directly in Google Calendar
- **THEN** the system does not overwrite the source work order from that external edit

### Requirement: Synchronization failure visibility
The system SHALL preserve local work-order changes when Google Calendar is unavailable and SHALL record a non-secret synchronization status suitable for user feedback and retry.

#### Scenario: Google synchronization fails
- **WHEN** Google rejects or times out during event creation, update, or deletion
- **THEN** the local work-order operation completes when otherwise valid and the system records a failed synchronization state with an actionable retry message

#### Scenario: Retry synchronization
- **WHEN** an authenticated user retries a failed synchronization after Google access is restored
- **THEN** the system reconciles the mapped event and marks synchronization successful without creating a duplicate
