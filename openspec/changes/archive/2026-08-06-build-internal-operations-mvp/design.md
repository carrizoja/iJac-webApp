## Context

The repository currently contains OpenSpec planning infrastructure but no application implementation. The MVP must establish a portfolio-quality monorepo and deliver a private operations tool across two independently deployable applications: an Astro web app intended for Vercel and a NestJS API intended for Railway. Firebase supplies user identity and Firestore persistence; Google Calendar requires a separate OAuth lifecycle because Firebase's browser SDK does not provide the long-lived refresh credential needed by a server.

The application is an internal, single-role system. Authenticated users share operational client and work-order data, but each Google Calendar connection belongs to the Firebase user who authorized it. Exact brand colors and typography remain provisional pending comparison with the public site's CSS.

## Goals / Non-Goals

**Goals:**

- Establish clear workspace and deployment boundaries while sharing framework-independent domain contracts.
- Keep privileged data access, Firebase token verification, validation, and Google OAuth credentials behind the NestJS API.
- Model client/work-order relationships safely in Firestore without relying on unsupported relational joins.
- Deliver responsive client, work-order, and calendar workflows with predictable error and loading states.
- Provide idempotent one-way Google Calendar synchronization that cannot corrupt local work orders when Google is unavailable.
- Make lint, typecheck, build, and focused automated tests straightforward locally and in CI.

**Non-Goals:**

- Two-way Google Calendar import, webhooks, or conflict resolution.
- Role-based authorization or separate tenant data partitions.
- Invoices, quotes, PDFs, attachments, notifications, or an external client portal.
- Deployment workflows or infrastructure provisioning for Vercel, Railway, Firebase, or Google Cloud.
- Relational reporting guarantees or migration to a relational database.
- Final brand-system approval.

## Decisions

### 1. Use a pnpm/Turborepo monorepo with strict package boundaries

The root workspace coordinates `apps/web`, `apps/api`, and `packages/shared`. The shared package contains plain TypeScript domain models, enums, API payload contracts, and validation-independent constants; it does not import Astro, React, NestJS, Firebase, or Google libraries. Each application owns its framework configuration and environment schema. Root scripts delegate lint, typecheck, test, and build tasks through Turborepo.

This keeps common contracts consistent without coupling the independent Vercel and Railway build targets. Separate repositories were rejected because they would add versioning and coordination overhead before the team or domain justifies it. A single full-stack framework was rejected because the separate Astro and NestJS targets are an explicit project constraint.

### 2. Treat NestJS as the sole application-data boundary

The browser uses the Firebase client SDK only for authentication. It sends the current Firebase ID token as a bearer token to NestJS. A global API guard verifies the token through Firebase Admin, exposes a trusted caller identity, and protects every business route except explicit health and OAuth callback endpoints. DTOs use `class-validator` and a global validation pipe with transformation, whitelisting, and rejection of unknown fields.

NestJS uses Firebase Admin for all client, work-order, Calendar mapping, and OAuth-connection persistence. Firestore client rules deny direct application-data and credential access; they are defense in depth, not a substitute for API authorization. Allowing direct browser CRUD was rejected because it would duplicate validation and authorization policy across Firestore rules and NestJS while making token confidentiality and referential checks harder.

Errors use a stable JSON envelope containing an application code, human-readable message, optional field errors, and request correlation identifier. The API maps validation, unauthenticated, forbidden, missing, conflict, and unexpected failures to appropriate HTTP statuses without returning stack traces or credentials.

### 3. Use top-level Firestore collections with explicit integrity metadata

The primary collections are:

- `clients/{clientId}`: `name`, `email`, `phone`, optional `organization`, optional `notes`, normalized search terms, `workOrderCount`, `createdAt`, and `updatedAt`.
- `workOrders/{workOrderId}`: `title`, `description`, `status`, `priority`, `clientId`, optional `dueDate`, `createdAt`, and `updatedAt`.
- `calendarConnections/{uid}`: encrypted refresh credential, encryption metadata, granted scopes, Google account metadata safe for server use, connection status, and timestamps.
- `calendarEventMappings/{uid_workOrderId}`: `uid`, `workOrderId`, Google calendar/event identifiers, last synchronized source version, status, sanitized error code/message, and timestamps.
- `oauthTransactions/{nonce}`: short-lived state and PKCE data used only while completing server-side Google authorization, with expiry suitable for automated cleanup.

Work orders store only the stable `clientId`; mutable client contact fields are not denormalized. List endpoints batch-read the bounded set of clients referenced by one page and return a client display summary. Client `workOrderCount` is updated transactionally when work orders are created, deleted, or moved to another client. Client deletion checks that counter in a transaction, preventing deletion when references exist without a cross-collection scan race.

The API writes timestamps using Firestore server timestamps. Public responses convert timestamps to ISO 8601 strings. Status and priority use shared closed enums. Firestore composite indexes cover the supported work-order filters and due-date calendar queries.

For basic client search, writes generate normalized lowercase prefix terms from name, email, phone, and organization. Search uses an `array-contains` query on one normalized prefix plus optional exact organization filtering, and results are paginated. This deliberately provides prefix-oriented basic search rather than pretending Firestore offers full-text substring search. A hosted search service was rejected for MVP cost and complexity.

### 4. Separate Firebase sign-in from server-owned Calendar authorization

The Firebase Google provider requests the Calendar scope while authenticating the browser, but its returned OAuth credential is short-lived and is never treated as the API's refresh credential. After Firebase sign-in, the authenticated browser starts a NestJS Calendar-connect flow. The API creates signed, expiring state tied to the verified Firebase `uid`, stores a short-lived PKCE verifier, and redirects through Google's authorization-code flow with offline access. The NestJS callback validates state, exchanges the one-time code using the server-held OAuth client secret, and stores the refresh credential for that `uid`.

Refresh credentials are encrypted with authenticated encryption before being written to Firestore. The encryption key and Google OAuth client secret live only in Railway environment variables; logs redact authorization headers, codes, access tokens, refresh credentials, and secrets. API responses expose only connection state and non-sensitive account metadata. If Google does not return a refresh credential and no valid stored credential exists, the user must reconnect with renewed consent.

Using only Firebase's access token was rejected because it expires and cannot support unattended refresh. Storing browser-obtained tokens was rejected because it expands the credential exposure surface. Google Secret Manager would provide stronger managed-secret controls, but app-level encryption is selected for MVP to avoid introducing another runtime service; this should be revisited before broader production use.

### 5. Deliver one-way, user-initiated Calendar sync for v1

The internal calendar is sourced from Firestore work orders and therefore remains available without Google. It queries non-cancelled work orders by due-date range and renders them responsively in the web application.

Google synchronization is one-way from iJac work orders to the connected user's Google Calendar. A user explicitly synchronizes an eligible due-dated work order once; after a mapping exists, later updates and deletion attempt to update or remove that same event. The mapping document provides idempotency, so retries update the known Google event instead of creating duplicates. Event descriptions include a stable application reference, not private OAuth data.

Local CRUD commits before the best-effort Google call. Google failures set a retryable mapping status and sanitized error while preserving local data. A retry endpoint reconciles the mapping. Refresh-token revocation marks the connection as requiring reconnection. The API uses bounded timeouts and does not retry permanent authorization or validation failures.

Two-way sync was rejected for this change. It requires webhook channel lifecycle management, externally edited event conflict rules, deletion semantics, and protection against sync loops. That complexity is disproportionate to MVP value; the mapping model leaves room for a later change to add inbound synchronization deliberately.

### 6. Build the frontend as authenticated feature slices

Astro owns routing and the page shell; React islands own interactive authentication, forms, filtered tables/lists, and calendar behavior. A small typed API client attaches Firebase ID tokens, normalizes API errors, and never calls Firestore directly. Feature code is organized around auth, clients, work orders, and calendar rather than generic technical layers.

The initial visual system uses the requested dark-slate anchor with accessible contrast, clear focus states, keyboard-operable controls, and layouts that adapt from data-dense desktop views to readable mobile cards or constrained tables. Exact palette and typography tokens remain easy to replace after brand review.

### 7. Validate behavior at the cheapest reliable layer

NestJS unit tests cover validation, guards, service rules, transactions, and Calendar error mapping. API integration tests use Firebase/Firestore emulator-compatible adapters or isolated repository fakes for HTTP contracts. Frontend component tests cover forms and state transitions; focused browser tests cover sign-in gating and the core client-to-work-order workflow with external identity and Calendar calls stubbed. CI runs lint, typecheck, tests required by the implemented root pipeline, and production builds, while the explicit MVP quality gate remains lint, typecheck, and build for both apps.

GitHub Actions uses Corepack with a pinned pnpm version, a maintained Node LTS version, frozen-lockfile installation, and Turborepo root commands. Deployment jobs and provider production secrets are intentionally absent.

## Risks / Trade-offs

- [Firestore prefix search is limited compared with full text] -> Document prefix behavior, normalize terms consistently, cap result pages, and revisit a search service only when usage demonstrates the need.
- [Counter-based referential integrity can drift after operational faults or manual console edits] -> Update counts only in transactions, test client changes and deletion races, and provide a future reconciliation script if manual administration becomes common.
- [Google may show more than one consent transition across Firebase sign-in and backend OAuth] -> Explain connection state in the UI, reuse prior grants where Google permits it, and keep Calendar connection separate from core app access.
- [Application-level token encryption depends on careful key handling] -> Keep keys out of source and logs, use authenticated encryption with versioned metadata, restrict Railway access, and define key rotation before production expansion.
- [Best-effort sync creates temporary divergence] -> Surface sync status, retain idempotent mappings, and provide explicit retries while treating Firestore as the source of truth.
- [A single shared role gives every authenticated account full operational access] -> Restrict allowed Google accounts or domains through configuration for MVP and create a separate RBAC change before inviting broader users.
- [Firestore read patterns can increase request cost] -> Bound page sizes, batch unique client lookups, create required indexes, and observe query/read counts before denormalizing.
- [Provisional visual tokens may change] -> Centralize Tailwind theme tokens and avoid embedding brand values throughout components.

## Migration Plan

1. Scaffold the workspace, applications, shared package, local environment examples, and root quality commands.
2. Configure Firebase projects, Firestore indexes/rules, Google OAuth credentials, and local emulator support without committing secrets.
3. Implement and verify API authentication before exposing any business endpoints.
4. Add client and work-order persistence, transactional integrity, API contracts, and focused tests.
5. Add authenticated web workflows and the Firestore-backed internal calendar.
6. Add encrypted Calendar connection storage and one-way synchronization behind explicit UI controls.
7. Add CI and verify a clean frozen install, lint, typecheck, tests, and production builds.

No existing application data requires migration. Rollback consists of reverting application changes and disabling the OAuth client or Firebase resources; deleting persisted collections is a separate, explicit administrative action and MUST NOT be part of automated rollback.

## Open Questions

- Which Google accounts or Workspace domain are allowed to access the MVP?
- Which Google Calendar should receive synchronized events: the user's primary calendar or a dedicated calendar selected during connection?
- What exact palette and typography should replace the provisional dark-slate tokens after reviewing `ijac.com.ar`?
- What operational process and key versioning schedule will be used to rotate the OAuth credential-encryption key before production use?
