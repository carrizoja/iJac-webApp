# frontend-experience-foundation Specification

## Purpose
Provide a consistent, accessible iJac-branded interaction foundation for the authenticated operations application across desktop and mobile workflows.
## Requirements
### Requirement: iJac brand-aligned visual system
The web application SHALL use a shared visual system derived from the established `ijac.com.ar` brand language, including dark neutral surfaces, iJac typography, controlled cyan/blue and purple gradients, consistent radii and borders, and semantic status and priority treatments.

#### Scenario: Render an authenticated operations page
- **WHEN** an authenticated user opens a client, work-order, or calendar page
- **THEN** the page uses the shared iJac visual tokens for typography, surfaces, actions, focus, and operational state indicators

#### Scenario: Distinguish operational states
- **WHEN** the interface presents work-order status, priority, success, warning, or destructive information
- **THEN** each state is distinguishable through text or iconography in addition to its semantic color

### Requirement: Consistent interaction primitives
The web application SHALL present actions, form controls, panels, badges, alerts, loading states, empty states, and destructive confirmations through shared interaction patterns with consistent enabled, hover, focus, disabled, pending, success, and error behavior.

#### Scenario: Use a primary action
- **WHEN** a user focuses, activates, or waits for a primary action
- **THEN** the action provides a consistent visible focus treatment, disabled or pending state, and completion or failure feedback

#### Scenario: Confirm a destructive action
- **WHEN** a user requests deletion of a client or work order
- **THEN** the application presents an accessible confirmation that identifies the affected record and allows cancellation before deletion

### Requirement: Responsive authenticated application shell
The web application SHALL provide one authenticated application shell that exposes navigation to home, clients, work orders, and calendar and remains operable across supported desktop and mobile viewports.

#### Scenario: Navigate on a desktop viewport
- **WHEN** an authenticated user opens the application on a desktop viewport
- **THEN** the shell presents the current destination, primary navigation, account identity, and sign-out action without obscuring page content

#### Scenario: Navigate on a mobile viewport
- **WHEN** an authenticated user opens the application on a mobile viewport
- **THEN** the shell provides keyboard- and touch-operable access to every primary destination and sign-out action without horizontal overflow

### Requirement: Accessible feedback and motion
The web application SHALL provide perceivable loading, empty, validation, error, and completion feedback and SHALL ensure that decorative transitions do not interfere with task completion.

#### Scenario: User prefers reduced motion
- **WHEN** the user's device reports a reduced-motion preference
- **THEN** the application removes or substantially reduces nonessential movement while preserving state changes and task feedback

#### Scenario: Complete a workflow with a keyboard
- **WHEN** a user operates authentication, navigation, forms, filters, dialogs, and actions using only a keyboard
- **THEN** controls follow a logical focus order and expose visible focus, labels, errors, and status messages

### Requirement: Operational workflow preservation
The visual-foundation migration SHALL preserve the existing authentication, client, work-order, internal-calendar, and Google Calendar connection contracts.

#### Scenario: Use an existing business workflow after migration
- **WHEN** a user performs an existing create, edit, filter, delete, connect, or synchronize workflow through the migrated interface
- **THEN** the application sends the same business request and preserves the same successful and failure outcomes as before the visual migration

