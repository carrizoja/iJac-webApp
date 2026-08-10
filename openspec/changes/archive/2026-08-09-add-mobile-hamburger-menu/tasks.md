## 1. Mobile Disclosure Control

- [x] 1.1 Add local mobile-menu state and a native hamburger trigger to `AppShell` with an accessible name, `aria-expanded`, `aria-controls`, a stable controlled-region id, and a minimum 44-by-44 CSS-pixel target.
- [x] 1.2 Render the hamburger/close icon with inline SVG and existing iJac shell tokens without adding an icon dependency or nonessential reduced-motion animation.

## 2. Responsive Navigation Behavior

- [x] 2.1 Replace the persistent mobile navigation grid with an in-flow, conditionally rendered navigation region while preserving all four destinations and the unchanged desktop navigation.
- [x] 2.2 Close the mobile menu when its trigger is activated again or a destination is selected, without changing normal link navigation.
- [x] 2.3 Close the open menu on Escape, restore focus to the trigger, and preserve account identity and sign-out access in both menu states.

## 3. Component Coverage

- [x] 3.1 Update `AppShell` component tests for the initially collapsed menu, trigger semantics, open and toggle-close behavior, and visibility of every primary destination.
- [x] 3.2 Add component tests for link-selection dismissal, Escape dismissal with trigger focus restoration, focus styling, and unchanged sign-out behavior.

## 4. Responsive Verification

- [x] 4.1 Extend authenticated Playwright coverage at a mobile viewport to verify the trigger target size, keyboard operation, menu destinations, dismissal, and absence of document-level horizontal overflow.
- [x] 4.2 Run focused `AppShell` tests, authenticated navigation Playwright coverage, web typecheck, and scoped lint checks; resolve regressions introduced by the change.
