## Context

See `proposal.md` for motivation. `AppShell` is a React island shared by all authenticated Astro routes. It currently renders one desktop navigation row and a second mobile-only two-column grid, while account identity and sign-out remain in the shell header. Existing tests cover destinations, sign-out, navigation labeling, and focus-style hooks but do not exercise a disclosure state.

The implementation must preserve the established dark capsule navbar, use the existing Tailwind breakpoints and focus tokens, add no dependency, and remain usable with touch, keyboard, and reduced-motion preferences.

## Goals / Non-Goals

**Goals:**
- Replace the persistent mobile link grid with a compact disclosure controlled by a native button.
- Keep menu state, semantics, focus behavior, and dismissal logic inside `AppShell`.
- Preserve the current desktop navigation, destinations, account context, sign-out action, and visual language.
- Prove component behavior and mobile viewport containment with focused automated tests.

**Non-Goals:**
- Introducing a site-wide drawer, modal, routing library, or reusable menu framework.
- Changing route names, authentication behavior, desktop layout, or page content.
- Persisting menu state across navigation or browser sessions.

## Decisions

### Use an in-flow disclosure instead of an overlay drawer

The hamburger button will reveal the mobile navigation directly below the shell's header row. This keeps the menu inside the existing bounded capsule, avoids backdrop and scroll-lock complexity, and prevents the menu from obscuring page content.

Alternative considered: a fixed side drawer. It provides more room but introduces a modal focus boundary, background interaction rules, scroll locking, and additional responsive failure modes that are unnecessary for four destinations.

### Keep state local to `AppShell`

A boolean React state will control whether the mobile navigation is rendered. The trigger will be a native `button` with an accessible name, `aria-expanded`, and `aria-controls` referencing a stable navigation-region id. A custom inline SVG will visually transition between menu and close states without adding an icon dependency.

Alternative considered: a CSS-only checkbox disclosure. It reduces React code but produces weaker semantics, makes Escape dismissal and focus restoration awkward, and separates interaction state from the component that owns the navigation.

### Define explicit dismissal behavior

Activating the trigger toggles the menu. Selecting a destination closes it before normal link navigation. While open, Escape closes the menu and returns focus to the trigger. No document-level outside-click handler will be added because it increases global event complexity without being required for an in-flow disclosure.

Alternative considered: close on every outside pointer event. This is familiar for overlays, but the menu does not cover content and already has clear toggle, destination, and Escape dismissal paths.

### Test behavior at component and route boundaries

Component tests will assert the initial collapsed state, accessible trigger contract, open/close behavior, destination links, Escape dismissal, focus restoration, and unchanged sign-out behavior. Playwright coverage will use an authenticated mobile route to verify a 44-pixel trigger, menu visibility, keyboard operation, destination availability, and no document-level horizontal overflow.

## Risks / Trade-offs

- [Risk] Conditional rendering removes mobile links from the DOM while collapsed, changing tests that currently expect duplicate desktop and mobile links. → Update assertions to test the disclosure contract rather than duplicate markup.
- [Risk] A menu left open while crossing the desktop breakpoint can retain stale local state. → Desktop navigation remains independent and visible; the mobile region remains breakpoint-hidden, so retained state has no effect on desktop operation.
- [Risk] Decorative icon animation could conflict with reduced-motion preferences. → Keep movement minimal and disable nonessential transition through the existing reduced-motion conventions.

## Migration Plan

1. Add disclosure state and accessible trigger behavior to `AppShell` while retaining the current desktop navigation.
2. Replace only the mobile navigation grid with the conditional in-flow menu.
3. Update component and Playwright coverage, then run web lint, typecheck, and relevant tests.
4. Roll back by restoring the current always-visible mobile grid; no data or API migration is required.
