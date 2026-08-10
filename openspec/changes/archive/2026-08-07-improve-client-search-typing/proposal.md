## Why

Typing in "Buscar clientes..." currently starts a loading state after every keystroke that replaces the entire client list, including the search input. The field loses focus, so users must repeatedly click it and cannot enter a complete name naturally.

## What Changes

- Keep the client search input mounted, focused, and editable while search requests are in progress.
- Debounce search requests so rapid typing does not send one request per keystroke.
- Preserve the current client results while a new search is pending and show compact, non-blocking progress feedback.
- Ensure late responses from older search terms cannot replace results for the newest term.
- Add interaction tests for uninterrupted typing, request timing, progress feedback, and out-of-order responses.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-management`: Extend client search behavior with responsive, non-blocking typing and latest-query result consistency.

## Impact

- Primarily affects `apps/web/src/components/clients/ClientList.tsx` and its component tests.
- Preserves the existing `GET /api/clients?search=` contract and Firestore search behavior.
- Introduces no new runtime dependency and does not alter client CRUD operations.
