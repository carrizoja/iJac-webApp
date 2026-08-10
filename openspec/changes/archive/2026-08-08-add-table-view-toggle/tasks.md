## 1. Shared View Control

- [x] 1.1 Add a typed `ViewModeToggle` UI component with `Tarjetas` and `Tabla` options, visible icons/labels, keyboard-operable native buttons, and `aria-pressed` state.
- [x] 1.2 Export the toggle and `ViewMode` type from the UI index and add focused tests for labels, pressed state, group naming, and change callbacks.

## 2. Clients Table Mode

- [x] 2.1 Add local card/table state to `ClientList` and place the shared toggle beside the existing create action without adding view mode to request dependencies.
- [x] 2.2 Render the current client result set as a semantic table with Name, Email, Phone, Organization, and Actions columns inside a bounded horizontal-scroll surface.
- [x] 2.3 Preserve accessible Edit/Delete actions, disabled states, and an adjacent full-width deletion confirmation row in client table mode.
- [x] 2.4 Extend `ClientList` tests for default cards, table semantics/content, active search preservation without refetch, action behavior, and deletion confirmation.

## 3. Work Orders Table Mode

- [x] 3.1 Add baseline `WorkOrderList` component coverage for loading, filters, cards, empty results, errors, and existing edit/delete behavior.
- [x] 3.2 Add local card/table state to `WorkOrderList` and place the shared toggle beside the existing create action without adding view mode to filter request dependencies.
- [x] 3.3 Render the current filtered work-order result set as a semantic table with Title, Client, Status, Priority, Due Date, and Actions columns inside a bounded horizontal-scroll surface.
- [x] 3.4 Preserve badges, date formatting, accessible actions, disabled states, and an adjacent full-width deletion confirmation row in work-order table mode.
- [x] 3.5 Extend `WorkOrderList` tests for default cards, table semantics/content, filter preservation without extra refetch, action behavior, and deletion confirmation.

## 4. Responsive And Quality Verification

- [x] 4.1 Run shared UI, Clients, and Work Orders component suites and resolve regressions.
- [x] 4.2 Run web typecheck and lint checks and resolve failures introduced by the change.
- [x] 4.3 Extend and run authenticated Playwright coverage for both routes, verifying keyboard view switching, table content, internal horizontal scrolling, and no page-level overflow at mobile width.
