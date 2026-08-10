## Why

The authenticated shell currently displays every primary navigation link as a persistent two-column block on mobile, consuming scarce vertical space before page content. A compact disclosure menu will keep navigation available while giving operational screens more room and a clearer mobile hierarchy.

## What Changes

- Replace the always-visible mobile navigation grid with a hamburger button that opens and closes the primary navigation menu.
- Keep the existing desktop navigation visible and unchanged at desktop breakpoints.
- Expose the menu's expanded state and controlled region to assistive technology.
- Preserve keyboard access, touch-friendly targets, primary destinations, account context, sign-out behavior, and page-width containment.
- Close the mobile menu after a destination is selected and when the user presses Escape.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-experience-foundation`: Refine the responsive authenticated application shell requirement so mobile primary navigation is exposed through an accessible hamburger disclosure menu.

## Impact

- Affects the authenticated React shell in `apps/web/src/components/layout/AppShell.tsx` and its component tests.
- Extends responsive browser coverage for authenticated routes in `apps/web/e2e/`.
- Does not change routes, authentication contracts, APIs, persistence, or desktop navigation behavior.
