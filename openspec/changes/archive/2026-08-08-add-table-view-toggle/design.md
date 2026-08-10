## Context

See `proposal.md` for motivation and the two delta specs for observable behavior. `ClientList` and `WorkOrderList` currently own their loaded records, query controls, deletion state, action styling, and card markup. Neither the UI library nor feature components provide a semantic table or a view-mode control.

The Clients list already separates background search progress from displayed results. The Work Orders list reloads when filters change. View switching must remain presentation-only so it does not enter either request dependency graph.

## Goals / Non-Goals

**Goals:**

- Provide one consistent, keyboard-accessible view switch used by both lists.
- Render dense semantic tables that retain the information, badges, actions, and confirmation behavior available in cards.
- Keep list request state, search/filter values, and loaded records unchanged when switching modes.
- Preserve the established dark editorial visual language and semantic action colors.
- Keep wide tables usable on small viewports without page-level horizontal overflow.
- Add component and browser regressions for both list surfaces.

**Non-Goals:**

- Persisting the selected view across reloads, routes, browsers, or users.
- Adding sorting, column resizing, column visibility, row selection, bulk actions, or new pagination controls.
- Changing API query parameters, server ordering, record models, or data fetching.
- Creating a general-purpose data-grid abstraction.

## Decisions

### Add a focused shared `ViewModeToggle`

Create a small UI component accepting `value: 'cards' | 'table'`, `onChange`, and an accessible group label. It renders a compact segmented control with visible `Tarjetas` and `Tabla` labels, complementary icons from the existing icon dependency, and `aria-pressed` state on native buttons. Export the component and its `ViewMode` type from the UI index.

Alternative considered: duplicate two styled buttons inside each list. Rejected because the interaction, accessibility contract, labels, and visual state are identical and likely to drift.

Alternative considered: build a generic table/data-grid component. Rejected because Clients and Work Orders have distinct columns, badge rendering, and confirmation rows; abstraction would add API surface without meaningful reuse.

### Keep mode state local and default to cards

Each list owns a `viewMode` state initialized to `cards`. The mode controls only the result markup branch and is excluded from request effects and callbacks. Search/filter state, records, loading, errors, and deletion state therefore survive a mode switch naturally.

Alternative considered: store preferences in `localStorage`. Rejected because persistence was not requested and introduces hydration, schema, and cross-device expectation concerns.

### Use feature-specific semantic tables

The Clients table includes Name, Email, Phone, Organization, and Actions. The Work Orders table includes Title, Client, Status, Priority, Due Date, and Actions. Each uses `table`, a visually hidden caption, `thead`, `tbody`, scoped column headers, stable row keys, existing badge semantics, and the same accessible Edit/Delete names as cards.

Alternative considered: CSS grid styled to resemble a table. Rejected because native table semantics provide better navigation and relationships for assistive technology with less custom ARIA.

### Keep deletion confirmation adjacent to its record

In table mode, render a full-width confirmation row immediately after the selected data row. Reuse the existing confirmation copy, Cancel/Delete controls, disabled states, and semantic destructive styling. Other rows and actions remain disabled according to the current single-confirmation rule.

Alternative considered: move confirmation into a modal. Rejected because that changes established behavior and focus-management requirements beyond this presentation feature.

### Contain table width at the feature surface

Wrap each table in a bordered, rounded container with `max-width: 100%` and horizontal overflow. Give the table a practical minimum width so columns remain readable. The page itself must not widen; users scroll the table region on narrow screens while the toolbar and surrounding layout remain fixed.

Alternative considered: hide columns or transform rows into cards at mobile breakpoints. Rejected because selecting table mode should consistently produce a table and hidden columns would remove information.

### Test behavior at shared, feature, and route boundaries

Add a focused test for toggle labels, pressed states, and changes. Extend ClientList tests and create WorkOrderList tests for default cards, semantic table columns/content, state preservation, actions, and confirmation rows. Extend Playwright route coverage to switch each authenticated page to table mode and verify the table container prevents document overflow on mobile.

Alternative considered: snapshot tests. Rejected because role/column/action assertions and viewport measurements provide stronger behavioral evidence.

## Risks / Trade-offs

- [Tables require horizontal scrolling on small screens] -> Keep cards as the default and make the table region visibly bounded and independently scrollable.
- [Card and table markup can diverge over time] -> Share formatters/action classes where practical and assert equivalent data/actions in component tests.
- [Inline confirmation rows can disrupt table semantics] -> Use a valid table row with one cell spanning all columns and keep confirmation controls within that cell.
- [Adding controls crowds existing toolbars] -> Place the compact segmented switch with the primary action group and allow the toolbar to wrap at existing breakpoints.
- [WorkOrderList currently lacks component tests] -> Introduce focused coverage before relying on table-mode changes.

## Migration Plan

1. Add and test the shared view-mode switch without changing existing lists.
2. Add local mode state and semantic table rendering to Clients, preserving all current search/loading/action behavior.
3. Add local mode state and semantic table rendering to Work Orders, preserving all current filters/loading/action behavior.
4. Run component, accessibility-oriented role assertions, web typecheck/lint, and responsive Playwright coverage.
5. Roll back the toggle and table branches together if regressions appear; no server or data migration is required.
