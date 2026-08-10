## Why

Clients and work orders are currently stored in global Firestore collections, so authentication proves who a caller is but does not isolate one organization's business data from another. Organization-scoped storage and authorization are needed before additional organizations or staff accounts can use the application safely.

## What Changes

- Introduce organizations and organization memberships as the authorization boundary for business data.
- Scope clients and work orders under an organization and require every repository operation to use the caller's authorized organization context.
- Preserve work-order-to-client integrity only within the same organization, including transactional work-order counts.
- Migrate existing global clients and work orders into a configured default organization with repeatable, verifiable migration tooling.
- Reject authenticated callers who do not belong to an active organization instead of allowing access to global records.
- **BREAKING**: Existing global Firestore document paths and backend repository contracts are replaced by organization-scoped paths and context.

## Capabilities

### New Capabilities
- `organization-data-isolation`: Defines organizations, membership-derived data scope, cross-organization isolation, and migration into a default organization.

### Modified Capabilities
- `user-authentication`: Extend server-side authorization to resolve an active organization membership for business endpoints.
- `client-management`: Restrict client lifecycle, discovery, and deletion integrity to the caller's organization.
- `work-order-management`: Restrict work-order lifecycle, filtering, client relationships, and calendar-facing retrieval to the caller's organization.

## Impact

- Affects NestJS authentication context, guards or authorization services, client and work-order repository contracts, Firestore paths, transactions, queries, indexes, and tests.
- Requires an organization and membership data model plus deployment configuration for the default organization.
- Requires a one-time migration command with dry-run, idempotency, conflict detection, verification, and rollback guidance before global records are retired.
- May affect calendar operations that load work orders and any API tests or fixtures that currently pass only a Firebase `uid`.
