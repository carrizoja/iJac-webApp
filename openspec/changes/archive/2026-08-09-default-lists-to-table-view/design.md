## Context

See `proposal.md` for motivation. `ClientList` and `WorkOrderList` independently own a local `ViewMode` state initialized to `cards`; the shared toggle is controlled by that state and both table renderers already implement the required content, actions, and bounded horizontal scrolling. Existing component and Playwright tests encode cards as the initial mode.

## Goals / Non-Goals

**Goals:**
- Align both list initializers and behavior tests on table mode as the default.
- Preserve the current local-state model and symmetric switching between table and cards.
- Keep search and filter requests independent from presentation changes.

**Non-Goals:**
- Persisting a user's selected mode between mounts or sessions.
- Changing table columns, card layouts, toggle styling, responsive behavior, APIs, or data loading.
- Introducing a shared list-state abstraction for two constant initializers.

## Decisions

### Change each local initializer directly

Initialize `viewMode` to `table` in both list components and leave the controlled `ViewModeToggle` contract unchanged. This is the smallest implementation that makes the visible table and pressed toggle state agree on first render.

Alternative considered: add a `defaultViewMode` prop or shared constant. Neither component currently has a consumer that needs a different default, so either abstraction would increase API surface without a concrete reuse case.

### Keep the preference ephemeral

Switching to cards remains local to the mounted list. No URL parameter, browser storage, or account preference will be introduced because the requested behavior defines a product default, not user-specific persistence.

Alternative considered: remember the last selection in local storage. That would make later visits potentially open as cards and therefore conflict with a deterministic table-default requirement.

### Invert existing default-mode tests

Component tests will assert table semantics and the pressed `Tabla` control on initial populated results, then verify switching to cards preserves search/filter state and does not introduce presentation-only requests. Route tests will assert the table is initially visible and remains bounded on mobile rather than clicking `Tabla` first.

## Risks / Trade-offs

- [Risk] Tables require horizontal scrolling on narrow screens more often than cards. → Retain and verify the existing bounded scroll containers and no page-level overflow.
- [Risk] Tests may pass by finding table text without proving the toggle's controlled state. → Assert both the table landmark/content and `aria-pressed="true"` on `Tabla`.
- [Risk] A presentation switch could accidentally trigger existing request effects. → Keep `viewMode` out of request dependencies and assert request counts when switching to cards.

## Migration Plan

1. Change both local view-mode initializers to `table`.
2. Update component and Playwright expectations from cards-first to table-first while retaining switch-back coverage.
3. Run focused tests, full web typecheck, scoped lint, and responsive route coverage.
4. Roll back by restoring both initializers and tests to `cards`; no data migration is required.
