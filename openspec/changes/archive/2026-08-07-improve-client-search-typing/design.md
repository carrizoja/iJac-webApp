## Context

See `proposal.md` for motivation and `specs/client-management/spec.md` for observable behavior. `ClientList` currently derives a `load` callback from the immediate `search` value. Every input change triggers the effect, sets a single `loading` flag, and returns an entirely different loading tree. Because that tree does not contain the controlled search input, React unmounts the field and browser focus is lost.

Search requests can also overlap. Without request identity or cancellation, an older response can finish after a newer response and replace the correct results.

## Goals / Non-Goals

**Goals:**

- Keep the search toolbar mounted through initial loading and subsequent searches.
- Separate initial list loading from background search progress.
- Reduce request volume during continuous typing with a short debounce.
- Preserve displayed results while a replacement query is pending.
- Apply results and errors only from the latest requested search term.
- Cover focus continuity, timing, progress, stale responses, and existing CRUD actions with deterministic component tests.

**Non-Goals:**

- Changing server-side search matching, pagination, or API contracts.
- Adding a client-side cache or a data-fetching dependency.
- Cancelling the underlying HTTP request; stale responses only need to be ignored.
- Redesigning client cards, actions, empty states, or the create/edit workflow.

## Decisions

### Split immediate input from the requested search term

Keep `search` as the controlled value updated on every keystroke and derive a debounced term after 300 milliseconds without input. Fetch effects depend on the debounced term, not the immediate value. This keeps typing synchronous while coalescing rapid changes into one request.

Alternative considered: request on every keystroke and use React deferred rendering. Rejected because deferred rendering can improve responsiveness but does not guarantee request coalescing and would continue unnecessary API traffic.

### Keep the toolbar mounted and distinguish loading phases

Render the search toolbar unconditionally. Use an initial-loading state only for the results region before the first response, then use a background-searching state for later requests. During background search, retain the current cards or empty state and add a compact `role="status"`/live-region indicator near the results.

Alternative considered: preserve focus by imperatively refocusing after each loading render. Rejected because the input would still be destroyed, keystrokes could be lost, and focus restoration would mask the structural defect.

### Use latest-request-wins sequencing

Assign a monotonically increasing identifier whenever a list request starts. A response may update clients, errors, and progress only when its identifier is still current. This handles out-of-order success and failure responses without extending the shared API helper with cancellation support.

Alternative considered: add `AbortSignal` through `listClients`, `apiGet`, and the shared request layer. Rejected for this focused change because it expands the blast radius; request identity provides the required UI consistency even when transport cancellation is unavailable.

### Preserve explicit reload behavior after deletion

After deleting a client, reload using the latest debounced search term through the same sequenced request path. Deletion progress remains independent from background search progress, and existing confirmation/error behavior stays intact.

Alternative considered: remove the deleted client optimistically from local state. Rejected because it changes deletion behavior and is unrelated to the focus defect.

### Test timing and concurrency at the component boundary

Extend `ClientList.test.tsx` with fake-timer and controllable-promise cases. Tests will prove the input keeps focus and its complete value, no search request occurs before the debounce, only the latest term is requested after rapid typing, current results remain during search, progress is announced, and an older response cannot overwrite newer results.

Alternative considered: rely on a browser-only regression test. Rejected because component tests provide deterministic control over timers and response ordering; one focused browser test can supplement them if existing E2E coverage already owns the Clients route.

## Risks / Trade-offs

- [A 300 ms delay makes results slightly less immediate] -> Keep the interval short and display progress as soon as the request begins.
- [Fake timers can make asynchronous tests brittle] -> Advance timers inside React `act` and use controllable promises only where response order matters.
- [An ignored stale request still consumes network resources] -> Accept this bounded cost to avoid broad request-layer changes; debounce substantially reduces request count.
- [Initial and background loading states can drift] -> Centralize list-request state transitions in one sequenced load path and test both phases.

## Migration Plan

1. Refactor `ClientList` state and request sequencing without changing its props or resource contract.
2. Add deterministic component regressions for uninterrupted typing and latest-query-wins behavior.
3. Run the focused client tests, web typecheck, lint, and existing Clients browser coverage.
4. Roll back the component and tests together if regressions appear; no server or data migration is required.
