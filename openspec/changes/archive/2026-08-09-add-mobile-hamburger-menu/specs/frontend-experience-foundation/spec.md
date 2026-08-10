## MODIFIED Requirements

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
