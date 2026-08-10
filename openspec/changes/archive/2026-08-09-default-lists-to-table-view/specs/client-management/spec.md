## MODIFIED Requirements

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
