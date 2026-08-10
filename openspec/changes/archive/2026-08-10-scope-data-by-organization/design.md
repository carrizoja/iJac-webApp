## Context

See `proposal.md` for motivation. The API already verifies Firebase ID tokens and passes a `UserRequest`, but client and work-order repositories ignore its `uid` and address global `clients` and `workOrders` collections. Firestore access uses the Admin SDK, so application authorization must be enforced by NestJS rather than delegated to client Security Rules.

Work-order transactions currently validate `clientId` and maintain `workOrderCount`. Calendar services call the same work-order repository, while Google Calendar credentials remain personal and are keyed by Firebase `uid`. Existing production-shaped records may already occupy the global collections and must remain recoverable through cutover.

## Goals / Non-Goals

**Goals:**
- Make organization scope an explicit, mandatory value from authentication through every business-data repository operation.
- Make cross-organization reads, writes, relationships, cursors, and aggregate updates impossible through normal API paths.
- Preserve current document identifiers and API response shapes where organization context is not externally relevant.
- Provide a deterministic migration and a cutover that can be verified before writes resume.

**Non-Goals:**
- Organization creation, invitations, billing, or a membership administration UI.
- Switching between multiple organizations in one user session; the first version supports one active membership per Firebase user.
- Moving user-owned Google OAuth credentials into organization storage.
- Deleting legacy global records automatically.

## Decisions

### Store organization business data in sibling subcollections

Use these paths:

```text
organizations/{organizationId}
organizations/{organizationId}/members/{uid}
organizations/{organizationId}/clients/{clientId}
organizations/{organizationId}/workOrders/{workOrderId}
organizations/{organizationId}/calendarEventMappings/{mappingId}
```

Path-based scoping makes the tenant boundary visible and lets existing client and work-order queries operate within a concrete organization collection. Work orders retain `clientId` rather than a mutable client snapshot; both references are constructed from the same organization root. Calendar connections and encrypted OAuth credentials remain keyed by `uid` because consent belongs to a person, while event mappings move with the organization-owned work order to avoid identifier collisions across organizations.

Alternative considered: keep top-level collections and add `organizationId` to every document. This supports cross-organization collection queries more directly, but one forgotten `where` clause under Admin SDK privileges could expose data. The application does not need cross-organization reporting, so structural scoping is safer.

### Resolve organization membership on the server

Introduce a server-controlled active membership lookup after Firebase token verification. A membership locator resolves the caller's single active `organizations/*/members/{uid}` membership and enriches a request-scoped actor context containing `uid`, `organizationId`, and `role`. Controllers and services pass this actor context; organization repositories consume `organizationId`, while user-owned Calendar credential repositories continue consuming `uid`.

Membership discovery needs a deterministic lookup. Maintain a server-only locator document at `activeOrganizationMemberships/{uid}` containing `organizationId` and status, then verify the corresponding organization membership document before authorizing the request. Provisioning and migration update both records together. This avoids trusting an organization header and avoids custom-claim refresh delays.

Alternative considered: accept `organizationId` from a route or header and validate membership. That supports multi-organization switching but expands every API contract and UI flow before it is needed. Firebase custom claims were also considered, but membership changes would remain stale until token refresh and claims have tight size and lifecycle constraints.

### Replace ignored `uid` repository parameters with explicit context

Client and work-order repository interfaces receive an organization context rather than a bare `uid`. Collection helpers require `organizationId`, so no repository method can silently fall back to a global collection. Calendar services pass both dimensions from the actor context according to ownership: organization scope for work-order data and user scope for OAuth credentials.

Unknown foreign identifiers return the existing not-found behavior. The API does not perform a global fallback lookup because that would disclose that another organization owns the identifier.

Alternative considered: retain `uid` and reinterpret it as tenant scope. That is misleading and would incorrectly partition shared organization data by employee.

### Keep relationship updates transactional inside one organization

Work-order creation, reassignment, and deletion continue using Firestore transactions. Every work-order reference and client counter reference is built below the same organization document before the transaction runs. Reassignment validates the target client in that organization and cannot construct a cross-organization target from request data.

Client list joins continue batching `getAll` calls, but all references point to the organization client subcollection. Cursors are resolved only in the organization work-order or client collection, so a cursor from another organization behaves as unknown.

### Deny direct browser access to business collections

Firestore Security Rules deny browser reads and writes for organization clients, work orders, membership locators, memberships, and event mappings. The browser continues using the authenticated NestJS API. Service-account IAM remains limited to deployment and API identities that require Firestore access.

Rules are defense in depth for client SDK traffic; they do not replace authorization checks in Admin SDK repositories.

### Use a two-phase, idempotent migration with a write freeze

Add an operator command requiring an explicit Firebase project and default organization identifier. It supports `--dry-run` and apply modes and performs these phases:

1. Validate the default organization and intended member provisioning inputs.
2. Read global clients and work orders, calculate relationship counts, and report missing clients or source counter discrepancies.
3. Compare each target document by stable identifier and canonical field values. Matching documents are skipped; conflicting documents stop verification and are never overwritten.
4. Copy clients first and work orders second in bounded batches, preserving Firestore timestamps and identifiers.
5. Copy organization-owned calendar event mappings where they reference migrated work orders; leave user-owned Calendar connections and credentials in place.
6. Re-read targets and verify totals, references, fields, and calculated counts before reporting success.

Run the apply phase during a maintenance window that blocks business-data writes. This avoids a dual-write mechanism and prevents source changes between copy and verification.

Alternative considered: lazy migration on first read. It creates mixed source-of-truth behavior, complicates transactions, and can expose global records through fallback paths, so it is rejected.

### Gate repository source for controlled cutover

Use validated deployment configuration to select `global` or `organization` repository mode during migration rollout. Production remains in global mode through dry-run and copy. After verification, deploy organization mode while writes remain frozen, run authenticated smoke tests for authorized and unauthorized users, then reopen writes.

The mode is temporary compatibility for persisted data and rollback, not a permanent per-request fallback. Organization mode never reads global collections.

## Risks / Trade-offs

- [Membership lookup adds a Firestore read to authenticated requests] -> Resolve once per request and permit a short server-side cache only if membership revocation semantics and tests remain explicit.
- [A missing organization context could accidentally reach legacy repositories] -> Make context required by types, remove default collection helpers, and test every repository method for foreign-scope isolation.
- [Migration races with live writes] -> Enforce a maintenance write freeze from source scan through target verification and smoke testing.
- [Existing client counters may already be inconsistent] -> Calculate counts from work-order relationships during dry-run and block cutover until discrepancies are resolved.
- [Rollback after organization writes resume would lose new data in global mode] -> Allow configuration rollback only before writes resume; after reopening writes, retain organization mode and forward-fix.
- [Collection path changes can invalidate assumptions in indexes and rules] -> Test emulator queries and deploy required rules/indexes before production cutover.
- [One-active-organization membership limits future account switching] -> Keep actor and repository context organization-based so a later selector can change resolution without changing persistence boundaries.

## Migration Plan

1. Add organization, membership, locator, scoped repository, rules, index, and migration support behind global repository mode.
2. Create the default organization and provision active memberships for approved existing users.
3. Run migration dry-run against the explicit production project; resolve orphan references, counter discrepancies, and target conflicts.
4. Announce and enable the business-write maintenance window.
5. Run migration apply and independent verification; retain untouched global records.
6. Deploy organization repository mode and force existing users to refresh application sessions if authorization context changed.
7. Smoke-test authorized CRUD, foreign-scope not-found behavior, forbidden non-members, work-order counts, filters, and Calendar work-order loading.
8. Reopen writes only after smoke tests pass. Retain global records for an agreed observation period, then remove the temporary global mode and archive legacy data in a separate change.

Rollback before step 8 restores global repository mode because global records remained untouched and writes were frozen. After step 8, rollback to global mode is prohibited without a separately verified reverse migration.
