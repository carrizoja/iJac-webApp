## ADDED Requirements

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
