## Context

See `proposal.md` for motivation. The current `SignIn` React component is rendered by `Protected` whenever Firebase reports no authenticated user. It directly owns the Google popup flow, pending state, and error state, and it currently renders only a heading, short description, and shared `Button`.

The visual reference at `josecarrizo-dev.com/login` uses a focused 384px desktop column: compact identity block, separated translucent access panel, full-width 50px primary action, quiet return link, and low-emphasis footer. The project already owns the corresponding iJac design ingredients in semantic CSS variables, Tailwind aliases, approved logos, Inter and Space Grotesk, SphereFez brand fonts, shared feedback primitives, Lucide icons, and Framer Motion. The implementation must preserve the existing Google-only Firebase flow and Calendar scope.

## Goals / Non-Goals

**Goals:**

- Translate the reference page's hierarchy, proportions, visual restraint, and responsive behavior into an iJac-owned login composition.
- Make the signed-out screen immediately identifiable as the iJac internal operations product.
- Keep authentication feedback accessible and layout-stable through idle, pending, and error states.
- Verify the visual contract in a real browser at desktop and mobile sizes in addition to focused component behavior.

**Non-Goals:**

- Reproduce the reference site's navigation, footer links, chat control, copy, logo, or source code.
- Add email/password authentication, registration, password recovery, theme switching, localization, or a separate public route.
- Change Firebase initialization, requested Google Calendar scope, route protection, API authorization, or post-authentication application shell.
- Introduce new fonts, color systems, production dependencies, or unapproved brand assets.

## Decisions

### Keep `SignIn` as the authentication boundary and compose the page within it

`Protected` will continue to select between loading, signed-out, and authenticated content. `SignIn` will retain ownership of the Google provider invocation and render the complete signed-out page so every protected route receives the same experience.

Alternative considered: add a dedicated `/login` Astro route and redirect all signed-out users. That would change routing behavior and require return-path handling without improving the requested visual result, so it is excluded from this change.

### Translate the reference composition, not its authentication model

The desktop layout will use a narrow centered column with three visual zones: identity, access panel, and quiet product footer. The access panel will contain context copy and a single full-width Google action rather than reference-style email and password fields. Mobile will collapse spacing and allow the panel to fill the viewport minus safe gutters while preserving the same reading order.

Alternative considered: render disabled email/password fields for visual fidelity. This would imply unsupported functionality, reduce clarity, and create an accessibility trap, so it is rejected.

### Use existing semantic tokens and approved assets exclusively

The page will use the approved iJac logo from `public/ijac`, existing typography families, dark background and panel tokens, cyan/blue gradient accents, semantic borders, focus treatment, and shared radii/shadows. Any atmospheric background treatment will be built from CSS gradients and pseudo-elements using existing tokens; it will not require new raster artwork.

Alternative considered: copy computed colors and font declarations directly from the reference. That would sever the page from the iJac design system and make future theming inconsistent, so the visual proportions are referenced while tokens remain project-owned.

### Preserve layout during pending and error states

The Google button will remain in place and switch to its existing loading semantics instead of replacing the entire page with a standalone spinner. Errors will render in a reserved, announced region near the action. This avoids content jumps and keeps product context available when a popup is blocked or cancelled.

Alternative considered: retain the current full-page pending replacement. It removes context and causes a large visual shift at the most sensitive point in the flow, so it is rejected.

### Split verification by responsibility

React tests will mock Firebase and verify one invocation, Calendar scope setup, disabled/pending state, and actionable failure feedback. Playwright will verify visible brand identity and action semantics, desktop/mobile fit, keyboard focus, reduced-motion rendering, and no horizontal overflow without completing third-party OAuth.

Alternative considered: automate the real Google popup. Third-party OAuth is nondeterministic, credential-dependent, and inappropriate for CI, so browser tests stop at the local interaction boundary.

## Risks / Trade-offs

- [The reference layout may evolve after this proposal] -> Record its observed composition and dimensions in this design, but implement against the approved behavioral spec and iJac tokens rather than a brittle pixel copy.
- [The approved positive and standard logos may have different intrinsic padding] -> Verify both against dark surfaces and choose the asset with the clearest contrast without altering its aspect ratio.
- [Decorative gradients can reduce text contrast or create mobile overflow] -> Keep atmosphere behind isolated noninteractive layers, test contrast, and assert document width at mobile and desktop viewports.
- [Firebase initialization can delay the signed-out screen] -> Keep the existing protected loading boundary and test the login independently with mocked auth state.
- [Visual regression coverage can become environment-sensitive] -> Prefer role/text/layout assertions for the initial change; add screenshot baselines only after fonts and browser versions are pinned in CI.

## Migration Plan

1. Add failing focused tests for the new signed-out composition and stable authentication states.
2. Rework `SignIn` using approved assets, semantic tokens, and existing shared primitives without modifying provider behavior.
3. Extend Playwright coverage across desktop and mobile viewports with OAuth kept at the mocked/local boundary.
4. Run web tests, E2E tests, lint, typecheck, and production build.
5. Roll back by restoring `SignIn` and its focused tests; no data, API, environment, or authentication migration is required.
