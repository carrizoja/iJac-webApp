## Why

Clients and work orders are operational datasets that benefit from dense, column-aligned comparison, but both views currently open as cards and require an extra switch on every visit. Making tables the default removes that repeated step while retaining cards as an optional presentation.

## What Changes

- Display populated client results in table mode by default when the Clients view opens.
- Display populated work-order results in table mode by default when the Work Orders view opens.
- Keep the existing `Tarjetas` option available so users can switch either list to cards during the current component session.
- Preserve search, filters, loading and empty states, actions, deletion confirmation, request behavior, and responsive table scrolling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-management`: Change the initial client-list presentation from cards to table while preserving both presentation choices.
- `work-order-management`: Change the initial work-order-list presentation from cards to table while preserving both presentation choices.

## Impact

- Affects initial view state in `ClientList` and `WorkOrderList` plus their component and route-level tests.
- Does not change APIs, persisted preferences, routes, data contracts, query behavior, or the shared `ViewModeToggle` interface.
