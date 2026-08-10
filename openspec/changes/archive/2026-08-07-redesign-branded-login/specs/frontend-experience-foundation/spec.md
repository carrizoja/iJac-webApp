## ADDED Requirements

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
