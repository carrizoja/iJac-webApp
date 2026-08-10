## 1. Client Table Default

- [x] 1.1 Initialize `ClientList` view mode to `table` without adding presentation state to search effects or request dependencies.
- [x] 1.2 Update client component coverage to assert the initial semantic table, `Tabla` pressed state, and existing row content/actions.
- [x] 1.3 Verify switching clients to `Tarjetas` preserves an active search and does not trigger a presentation-only request.

## 2. Work-Order Table Default

- [x] 2.1 Initialize `WorkOrderList` view mode to `table` without adding presentation state to filter effects or request dependencies.
- [x] 2.2 Update work-order component coverage to assert the initial semantic table, `Tabla` pressed state, and existing row details/actions.
- [x] 2.3 Verify switching work orders to `Tarjetas` preserves active filters and does not trigger a presentation-only request.

## 3. Responsive Route Coverage

- [x] 3.1 Update authenticated Clients and Work Orders Playwright coverage to assert table-first rendering, optional card switching, bounded internal scrolling, and no document-level overflow at mobile width.

## 4. Quality Verification

- [x] 4.1 Run focused list component tests, authenticated route Playwright coverage, web typecheck, and scoped lint checks; resolve regressions introduced by the default change.
