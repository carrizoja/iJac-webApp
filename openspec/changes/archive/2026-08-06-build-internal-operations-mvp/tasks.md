## 1. Workspace Foundation

- [x] 1.1 Create the root pnpm workspace, pinned package manager, shared TypeScript configuration, Turborepo pipeline, ignore rules, and root lint/typecheck/test/build scripts.
- [x] 1.2 Scaffold `apps/web` with Astro, React integration, Tailwind CSS, linting, typechecking, testing, and production build configuration.
- [x] 1.3 Scaffold `apps/api` with NestJS, linting, typechecking, testing, production build configuration, and a public health endpoint.
- [x] 1.4 Create `packages/shared` with framework-independent `Client`, `WorkOrder`, `User`, and `CalendarEvent` contracts plus closed status and priority values.
- [x] 1.5 Add typed environment schemas and `.env.example` files for browser-safe Firebase settings, API/Firebase Admin settings, Google OAuth, CORS, and credential encryption without committing secrets.
- [x] 1.6 Document local prerequisites, workspace commands, application boundaries, environment setup, and emulator workflow in the root README.

## 2. API Platform and Firestore

- [x] 2.1 Configure the NestJS application with Firebase Admin, validated configuration, CORS for the web origin, global DTO validation, request correlation identifiers, and production-safe logging.
- [x] 2.2 Implement a stable API error envelope and exception mapping for validation, authentication, not-found, conflict, external-service, and unexpected failures.
- [x] 2.3 Add Firestore emulator configuration, deny-by-default client security rules, required composite indexes, and server timestamp serialization helpers.
- [x] 2.4 Define repository interfaces and Firebase Admin implementations for clients, work orders, Calendar connections, OAuth transactions, and event mappings.
- [x] 2.5 Add API test utilities for authenticated HTTP requests and isolated Firestore/repository behavior without real Firebase or Google credentials.

## 3. Authentication and Authorization

- [x] 3.1 Configure Firebase Authentication in the web app and implement Google sign-in requesting the Calendar scope, sign-out, loading, cancellation, and provider-error states.
- [x] 3.2 Implement protected Astro application routes and a typed API client that obtains and sends current Firebase ID tokens without persisting OAuth credentials.
- [x] 3.3 Implement the NestJS Firebase ID-token guard, trusted caller context, public-route annotation, and optional configured account/domain allowlist.
- [x] 3.4 Add guard and HTTP tests proving valid tokens pass and missing, invalid, expired, revoked, or disallowed identities cannot execute business endpoints.
- [x] 3.5 Build the authenticated application shell with responsive navigation for clients, work orders, calendar, connection state, and sign-out.

## 4. Client Management

- [x] 4.1 Implement client DTOs and normalization for required fields, contact validation, server timestamps, normalized search prefixes, and organization filters.
- [x] 4.2 Implement authenticated client create, detail, update, paginated list, prefix search, and organization-filter API endpoints.
- [x] 4.3 Implement transactional client deletion that rejects records with a nonzero work-order count and returns the specified conflict response.
- [x] 4.4 Add service and HTTP tests for client validation, timestamp preservation, pagination, search/filter behavior, not-found responses, and guarded deletion.
- [x] 4.5 Build responsive client list, search/filter, empty, loading, and error states with links to create and detail workflows.
- [x] 4.6 Build accessible client create/edit forms and a confirmation-based delete flow with field-level API errors and dependency-conflict feedback.
- [x] 4.7 Add frontend tests for client form validation, result filtering, successful mutations, empty results, and API failure states.

## 5. Work-Order Management

- [x] 5.1 Implement work-order DTOs for title, description, closed status/priority values, existing `clientId`, optional due date, and server timestamps.
- [x] 5.2 Implement transactional work-order creation and deletion that maintain the linked client's `workOrderCount`.
- [x] 5.3 Implement transactional work-order updates, including atomic counter changes when moving an order between clients.
- [x] 5.4 Implement authenticated detail and paginated list endpoints with status, priority, client, and due-date-range filters plus bounded client display summaries.
- [x] 5.5 Add service and HTTP tests for validation, unknown client references, lifecycle values, filters, counter integrity, client moves, not-found responses, and deletion.
- [x] 5.6 Build responsive work-order list, filter, empty, loading, and error states showing client name, status, priority, and due date.
- [x] 5.7 Build accessible work-order create/edit/detail forms and confirmation-based deletion using live client choices and shared lifecycle values.
- [x] 5.8 Add frontend tests for work-order forms, filters, client selection, status changes, deletion, and API failure states.

## 6. Internal Calendar

- [x] 6.1 Implement an authenticated API query for non-cancelled work orders in a bounded due-date range using the required Firestore index.
- [x] 6.2 Build responsive month/week calendar views that render due-dated work orders by title, status, and priority and link to work-order details.
- [x] 6.3 Add calendar loading, empty, range-navigation, and API-error states while excluding undated and cancelled work orders from dated results.
- [x] 6.4 Add API and frontend tests for due-date boundaries, excluded records, period navigation, and opening a calendar item.

## 7. Google Calendar Connection

- [x] 7.1 Resolve and document the MVP account allowlist, target-calendar policy, OAuth redirect URLs, and encryption-key ownership before enabling Calendar credentials.
- [x] 7.2 Implement versioned authenticated encryption/decryption for refresh credentials with redaction tests proving secrets cannot enter responses or logs.
- [x] 7.3 Implement authenticated Calendar connection start/status endpoints using signed expiring state and a short-lived server-side PKCE transaction.
- [x] 7.4 Implement the Google OAuth callback, authorization-code exchange with offline access, encrypted refresh-credential persistence, reconnect handling, and safe web redirects.
- [x] 7.5 Build web connection/reconnection controls that show connected, disconnected, pending, and failed states without exposing provider credentials.
- [x] 7.6 Add API and frontend tests for state validation, expiry, missing refresh credentials, token exchange failures, account connection state, and credential confidentiality.

## 8. One-Way Google Calendar Synchronization

- [x] 8.1 Implement Google Calendar client creation from encrypted per-user credentials with bounded timeouts and revoked-credential detection.
- [x] 8.2 Implement explicit synchronization of eligible work orders to a deterministic event mapping, including stable application references and duplicate-safe retries.
- [x] 8.3 Update mapped events after local work-order changes and attempt mapped-event removal after deletion without rolling back valid local CRUD.
- [x] 8.4 Persist sanitized pending, successful, failed, and reconnect-required synchronization states and expose an authenticated retry endpoint.
- [x] 8.5 Add work-order and calendar UI controls for initial sync, progress, success, failure, reconnect guidance, and retry.
- [x] 8.6 Add tests for event creation, idempotent update, deletion, Google timeouts, permanent errors, revoked credentials, local-write preservation, and retry recovery.

## 9. Visual Quality and Accessibility

- [x] 9.1 Centralize provisional dark-slate palette, typography, spacing, focus, status, and priority tokens so brand values can be replaced after live-site review.
- [x] 9.2 Verify keyboard operation, labels, error associations, focus management, contrast, reduced-motion behavior, and responsive layouts across authentication and all MVP workflows.
- [ ] 9.3 Add focused browser tests for authentication gating and the end-to-end client-to-work-order-to-calendar workflow with Firebase and Google integrations stubbed.

## 10. CI and Final Verification

- [x] 10.1 Add `.github/workflows/ci.yml` for pushes and pull requests using maintained Node LTS, Corepack, pinned pnpm, dependency caching, and frozen-lockfile installation.
- [ ] 10.2 Run root lint, typecheck, focused tests, and production builds in CI for the web app, API, and shared package without deployment steps or production provider secrets.
- [ ] 10.3 Verify a clean local install and all root quality commands, then fix nondeterministic, environment-dependent, or workspace-boundary failures.
- [ ] 10.4 Review every OpenSpec scenario against implemented tests or documented manual verification and record any accepted MVP limitation.
- [ ] 10.5 Update the README with final local setup, Firebase/Google console configuration, security assumptions, Calendar one-way-sync behavior, CI gates, and future deployment work.
