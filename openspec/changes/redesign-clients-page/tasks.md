## 1. Establish the Clients Visual Contract

- [x] 1.1 Add focused Clients page/component tests for breadcrumb, accent pill, editorial heading, supporting copy, and primary/secondary action hierarchy
- [x] 1.2 Add state tests for client loading, empty, error, create/edit form visibility, and deletion confirmation without changing resource mocks or callbacks
- [x] 1.3 Add assertions that search, create, edit, cancel, save, and delete controls preserve their existing accessible names and pending/disabled behavior

## 2. Build the Editorial Clients Surface

- [x] 2.1 Add or verify semantic tokens needed for the reference-aligned green accent, bordered dark surface, gradients, focus, and restrained shadows without hardcoded page-wide colors
- [x] 2.2 Recompose `apps/web/src/pages/clients/index.astro` with breadcrumb context and responsive editorial introduction based on the screenshot hierarchy
- [x] 2.3 Restyle `ClientManager` and `ClientList` around the large rounded bordered content surface, search/create toolbar, client cards, loading, empty, error, and deletion states
- [x] 2.4 Restyle `ClientForm` with the same panel hierarchy, field spacing, primary save action, secondary cancel action, validation feedback, and stable pending state
- [x] 2.5 Verify all page actions use shared Button variants and preserve existing resource calls, validation, authorization, and deletion dependency behavior

## 3. Make the Surface Responsive and Browser-Tested

- [x] 3.1 Add Playwright coverage for the Clients page hierarchy and action names at the deterministic signed-in/data boundary
- [x] 3.2 Verify the spacious desktop editorial panel, heading scale, button contrast, card layout, and absence of clipped content
- [x] 3.3 Verify mobile reading order, responsive toolbar/form/card layout, minimum touch targets, and no horizontal overflow
- [x] 3.4 Verify keyboard focus, pending/disabled controls, semantic state cues, and reduced-motion behavior in Chromium

## 4. Complete Verification

- [x] 4.1 Run focused Clients component tests and the Clients Playwright suite without live API or Firebase dependencies
- [x] 4.2 Run `pnpm --filter @ijac/web lint`, `pnpm --filter @ijac/web typecheck`, and `pnpm --filter @ijac/web build` and resolve every new diagnostic
- [x] 4.3 Perform a final screenshot comparison against the supplied reference hierarchy while confirming client data and business behavior are unchanged
