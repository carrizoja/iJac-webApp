## 1. Non-Blocking Search Flow

- [x] 1.1 Refactor `ClientList` to separate the immediate input value from a 300 ms debounced search term and route list requests through latest-request-wins sequencing.
- [x] 1.2 Keep the search toolbar mounted during initial and background loading, preserve current results during replacement searches, and expose compact accessible search progress.
- [x] 1.3 Reload the active debounced search through the same sequenced request path after client deletion while preserving existing confirmation and error behavior.

## 2. Client Search Regression Coverage

- [x] 2.1 Update the initial-loading test to verify the search control remains available while only the results region reports loading.
- [x] 2.2 Add deterministic timer tests proving rapid typing retains focus and the complete value while issuing only the latest search after 300 ms.
- [x] 2.3 Add controllable-response tests proving current results remain visible with accessible progress and stale responses cannot replace latest-term results or errors.
- [x] 2.4 Re-run and preserve existing client create, edit, delete, empty, and error-state component coverage.

## 3. Verification

- [x] 3.1 Run the focused Clients component test suites and resolve regressions.
- [x] 3.2 Run web typecheck and lint checks and resolve failures introduced by the refactor.
- [x] 3.3 Run the existing Clients Playwright coverage to verify uninterrupted search typing at the route boundary.
