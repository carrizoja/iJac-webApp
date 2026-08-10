## 1. Lock the Signed-Out Contract

- [x] 1.1 Add focused `SignIn` component tests for iJac identity, concise access copy, and the single supported Google sign-in action
- [x] 1.2 Add authentication interaction tests that verify the Calendar scope, prevent duplicate activation while pending, and expose an actionable error after popup failure or cancellation
- [x] 1.3 Add assertions that pending and error states preserve the login composition instead of replacing the full page

## 2. Build the Branded Login Composition

- [x] 2.1 Verify the approved logo variants on the dark login surface and select the clearest existing asset without changing its aspect ratio
- [x] 2.2 Rework `SignIn` into the reference-inspired identity, access-panel, and quiet-footer composition using semantic iJac tokens and existing typography
- [x] 2.3 Present the existing Google action as a full-width accessible primary control with an appropriate icon, visible focus, 44px minimum target size, and stable pending state
- [x] 2.4 Integrate an announced error region that remains keyboard reachable and does not expose Firebase or Google provider internals
- [x] 2.5 Add restrained CSS-gradient atmosphere and bounded entrance transitions that disable or substantially reduce under `prefers-reduced-motion`

## 3. Make the Experience Responsive and Browser-Tested

- [x] 3.1 Extend Playwright coverage for signed-out identity, supporting copy, and the Google sign-in action without automating third-party OAuth
- [x] 3.2 Verify the centered narrow-column desktop composition and assert that visible controls are not clipped or obscured
- [x] 3.3 Verify mobile reading order, minimum interactive target size, viewport-safe gutters, and absence of horizontal overflow
- [x] 3.4 Verify keyboard focus visibility and reduced-motion behavior in a real Chromium browser

## 4. Complete Verification

- [x] 4.1 Run focused `SignIn` component tests and the Playwright login suite until deterministic without Firebase credentials or Google network calls
- [x] 4.2 Run `pnpm --filter @ijac/web lint`, `pnpm --filter @ijac/web typecheck`, and `pnpm --filter @ijac/web build` and resolve every new diagnostic
- [x] 4.3 Perform a final desktop and mobile visual review against the recorded reference hierarchy while confirming all colors, fonts, copy, and assets remain iJac-owned
