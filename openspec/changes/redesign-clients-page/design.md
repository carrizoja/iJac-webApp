## Context

See `proposal.md` for motivation. The Clients route currently supplies `ClientManager` inside the shared authenticated shell. `ClientManager` coordinates create/edit visibility, `ClientList` owns search, retrieval, cards, deletion confirmation, and state feedback, and `ClientForm` owns validation and resource mutations. Existing shared `Button`, `Input`, `Panel`, `Alert`, `EmptyState`, and `LoadingState` primitives already expose the required behavior.

The supplied reference is a dark iJac service page with a compact breadcrumb, a large rounded bordered container, a green outlined pill, oversized white heading, muted paragraph, neon-green outlined primary action, and subdued bordered secondary action. The Clients page should adopt that hierarchy and contrast, while keeping operational content dense enough for client management.

## Goals / Non-Goals

**Goals:**

- Establish a recognizable editorial entry section for Clients without duplicating the reference page's service copy.
- Make primary create/save actions visually prominent and secondary cancel/edit actions restrained but clear.
- Give search, cards, forms, empty states, errors, and confirmations one coherent surface treatment.
- Keep desktop composition spacious and mobile composition practical, keyboard accessible, and overflow-free.

**Non-Goals:**

- Change client API contracts, data model, validation rules, authorization, pagination/search semantics, or deletion integrity.
- Redesign the authenticated shell globally or change other feature pages.
- Add new client capabilities, filters, sorting, bulk actions, or service-page content.
- Copy the screenshot's exact text, external assets, or implementation code.

## Decisions

### Compose the page at the route/manager boundary

The page introduction and outer editorial surface will be owned by the Clients page and `ClientManager`, while `ClientList` and `ClientForm` remain responsible for their existing data and mutation boundaries. This keeps the visual hierarchy close to the page and avoids duplicating API logic.

Alternative considered: make `ClientList` own the entire page hero. That would couple data retrieval to page framing and make the manager's create/edit state harder to present consistently, so it is rejected.

### Extend semantic tokens instead of hardcoding screenshot colors

The implementation will use existing background, panel, border, foreground, gradient, focus, and transition tokens. If the reference's green accent is not represented semantically, add a named accent token rather than using raw green utilities throughout the page. This keeps the screenshot's identity while preserving future theme control.

Alternative considered: use direct `emerald-*` and `slate-*` classes everywhere. That would repeat the incomplete migration problem previously found in the app and make the new surface inconsistent with the established brand system.

### Use shared Button variants for the reference hierarchy

Create/save will use the strongest existing primary treatment, secondary/cancel and edit will use the bordered secondary treatment, and destructive actions will retain their destructive semantics. Custom classes may adjust radius, width, and responsive sizing but must not bypass shared disabled, pending, and focus behavior.

Alternative considered: create a page-specific button component. The existing Button already centralizes accessibility and pending behavior, so a new primitive would add duplication without improving the page contract.

### Preserve cards and confirmation as operational surfaces

Client records will remain discrete cards/panels so scanning and edit/delete actions remain direct. The delete confirmation will use the existing inline confirmation flow, restyled with the same bordered panel and semantic warning/destructive treatment rather than replacing it with a browser dialog.

Alternative considered: replace cards with a dense table. A table would be less resilient on mobile and would require new responsive interaction patterns, so it is outside this visual-only change.

### Verify visual structure without requiring live client data

Component tests will cover class/role hierarchy and existing callbacks using mocked resources. Playwright will assert the page's signed-in surface only if an auth fixture is available; otherwise it will cover the static page route/structure through the existing deterministic boundary and avoid external Firebase/API dependencies. Responsive assertions will focus on visible geometry, focus, target sizes, and overflow.

## Risks / Trade-offs

- [Oversized editorial heading consumes vertical space] -> Keep the intro bounded, allow the content panel to follow immediately, and validate a 375px viewport.
- [Bright green accent can compete with cyan/blue iJac actions] -> Reserve it for the page cue or primary create action and keep supporting controls neutral.
- [Client cards can become visually noisy with multiple actions] -> Use consistent action grouping, compact metadata hierarchy, and restrained panel borders.
- [Restyling shared primitives could affect other pages] -> Prefer page-level composition and class overrides; modify shared tokens only when the change is semantically reusable and run the full web suite.
- [Current tests do not cover ClientList] -> Add focused structural tests around loading, empty, error, and rendered action states without changing resource contracts.

## Migration Plan

1. Add focused client component/page tests for the visual hierarchy and preserved actions.
2. Implement the editorial page framing and restyle manager/list/form surfaces with existing primitives and semantic tokens.
3. Add responsive Playwright assertions for the Clients page, using the project’s deterministic auth/data boundary.
4. Run web tests, Playwright tests, lint, typecheck, and build.
5. Roll back the page and component class changes while retaining all data/API code unchanged.
