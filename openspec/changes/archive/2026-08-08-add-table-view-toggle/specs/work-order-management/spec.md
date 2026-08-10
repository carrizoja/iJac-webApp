## ADDED Requirements

### Requirement: Work-order list presentation modes
The system SHALL allow authenticated users to present the current work-order result set as cards or as a semantic table while preserving the same work-order details and available actions.

#### Scenario: Open the work-order list
- **WHEN** an authenticated user opens the Work Orders view
- **THEN** the current work-order result set is displayed in card mode by default and both presentation choices are available

#### Scenario: Switch work orders to table mode
- **WHEN** the user selects table mode while work-order filters are active
- **THEN** the same filtered result set is displayed in a table without clearing filters or requesting replacement data solely because of the view change

#### Scenario: Inspect work-order details in table mode
- **WHEN** work orders are displayed as a table
- **THEN** each row identifies the title, linked client, status, priority, optional due date, and available actions

#### Scenario: Use work-order actions in table mode
- **WHEN** the user edits or starts deleting a work order from a table row
- **THEN** the system preserves the existing edit behavior, accessible action names, and deletion confirmation workflow

#### Scenario: View the work-order table on a narrow screen
- **WHEN** the work-order table is wider than its available list surface
- **THEN** the table can scroll horizontally within that surface without causing horizontal overflow for the application page
