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

#### Scenario: Open mobile navigation
- **WHEN** an authenticated user opens the application on a mobile viewport and activates the collapsed primary-navigation control
- **THEN** the shell reveals every primary destination without horizontal overflow and communicates that the control is expanded and which navigation region it controls

#### Scenario: Operate mobile navigation with a keyboard
- **WHEN** a keyboard user opens the mobile navigation and moves through its controls
- **THEN** every destination remains reachable in a logical focus order with visible focus treatment and touch targets of at least 44 by 44 CSS pixels

#### Scenario: Dismiss mobile navigation
- **WHEN** the mobile navigation is open and the user selects a destination, activates its control again, or presses Escape
- **THEN** the shell closes the navigation, communicates the collapsed state, and preserves access to account identity and sign-out

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

### Requirement: Branded signed-out access experience
The web application SHALL present signed-out users with a dedicated iJac-branded access experience that uses the shared visual system, clearly identifies the internal operations product, and exposes the supported Google sign-in action without presenting unsupported authentication methods.

#### Scenario: Open a protected route while signed out
- **WHEN** a signed-out user opens any protected application route
- **THEN** the application presents the iJac identity, a concise internal-access explanation, and one clearly labeled Google sign-in action in a focused access composition

#### Scenario: View the access experience on a desktop viewport
- **WHEN** a signed-out user opens the application at a supported desktop viewport
- **THEN** the identity and access panel remain visually centered with restrained supporting content and no obscured, clipped, or horizontally overflowing controls

#### Scenario: View the access experience on a mobile viewport
- **WHEN** a signed-out user opens the application at a supported mobile viewport
- **THEN** the access composition adapts to the available width, preserves logical reading order, and keeps the primary action and interactive targets at least 44 by 44 CSS pixels

#### Scenario: Start Google sign-in
- **WHEN** the user activates the Google sign-in action
- **THEN** the action communicates its pending state, prevents duplicate activation, and preserves a stable page composition while authentication is in progress

#### Scenario: Google sign-in fails or is cancelled
- **WHEN** Google sign-in does not establish an authenticated session
- **THEN** the access experience remains available and presents an actionable, keyboard-reachable error without exposing provider internals or credentials

#### Scenario: Use keyboard navigation or reduced motion
- **WHEN** a user navigates with a keyboard or requests reduced motion
- **THEN** the access experience provides visible focus in logical order and removes or substantially reduces nonessential decorative movement without hiding state changes
