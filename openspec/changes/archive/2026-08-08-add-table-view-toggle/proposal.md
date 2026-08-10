## Why

Clients and work orders are currently available only as cards, which becomes inefficient when users need to scan and compare many records. A compact table option will improve information density while retaining the existing card presentation for visual browsing and narrow screens.

## What Changes

- Add an accessible `Tarjetas` / `Tabla` view switch to the Clients and Work Orders list toolbars.
- Keep cards as the default view and switch presentation without refetching or resetting active search/filter state.
- Render semantic tables with the same record information and edit/delete actions available in cards.
- Preserve inline deletion confirmation, loading, empty, error, search, and filter behavior in both view modes.
- Contain table overflow within the list surface on narrow screens so the application does not gain horizontal page overflow.
- Add shared toggle, component, accessibility, responsive, and route-boundary regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-management`: Allow users to view the current client result set as cards or a semantic table without disrupting search or actions.
- `work-order-management`: Allow users to view the current filtered work-order result set as cards or a semantic table without disrupting filters or actions.

## Impact

- Affects the Clients and Work Orders list components, their component tests, shared UI exports, and route-level Playwright coverage.
- Preserves existing API requests, pagination contracts, record models, sorting, search, and filtering behavior.
- Adds no runtime dependency and does not persist view preference across page reloads.
