## 1. Organization Context Foundation

- [x] 1.1 Add shared API types for organization membership, role, and authenticated actor context without changing public response payloads.
- [x] 1.2 Implement Firestore organization membership and active-membership locator access with active-status verification.
- [x] 1.3 Enrich authenticated requests with the server-resolved actor context and return forbidden for missing, inactive, or inconsistent memberships.
- [x] 1.4 Add authentication tests proving invalid tokens remain unauthorized, active members are admitted, and valid non-members are forbidden before business repositories execute.

## 2. Organization-Scoped Persistence

- [x] 2.1 Refactor client repository contracts and services to require organization context and address `organizations/{organizationId}/clients` exclusively in organization mode.
- [x] 2.2 Refactor work-order repository contracts, services, and Calendar callers to require organization context and address organization work orders and clients exclusively.
- [x] 2.3 Move Calendar event mapping persistence under the owning organization while keeping Calendar connections and OAuth credentials scoped by Firebase `uid`.
- [x] 2.4 Preserve organization-local work-order create, reassignment, deletion, client-count transactions, joins, filters, due-date queries, and cursor behavior.
- [x] 2.5 Add repository tests with two organizations proving foreign identifiers and cursors behave as not found and cannot alter records or counters across boundaries.

## 3. Rules, Indexes, and Runtime Configuration

- [x] 3.1 Add validated configuration for temporary `global` and `organization` repository modes with no per-request fallback between sources.
- [x] 3.2 Update Firestore Security Rules to deny direct client-SDK access to organization business data, memberships, membership locators, and event mappings.
- [x] 3.3 Update Firestore index configuration for scoped client search and work-order filter, ordering, and due-date queries.
- [x] 3.4 Add configuration and emulator tests that exercise the scoped rules and every required composite query.

## 4. Default Organization Migration

- [x] 4.1 Implement an operator command that requires explicit Firebase project and default organization identifiers and supports dry-run and apply modes.
- [x] 4.2 Add default organization and approved-user membership provisioning, updating membership documents and active-membership locators consistently.
- [x] 4.3 Implement source analysis for orphan work orders, calculated client counts, source-count discrepancies, target conflicts, and planned copies without writes in dry-run mode.
- [x] 4.4 Implement bounded, client-first copying that preserves document identifiers, timestamps, relationships, and organization-owned Calendar event mappings without deleting global records.
- [x] 4.5 Implement post-copy verification of canonical fields, totals, references, and calculated work-order counts, with non-zero command exit status for any conflict or mismatch.
- [x] 4.6 Add migration tests for clean migration, dry-run immutability, safe reruns, target conflicts, orphan references, count discrepancies, and partial previous runs.

## 5. End-to-End Authorization Verification

- [x] 5.1 Update API test fixtures to provision organization, membership, and actor context explicitly instead of relying on Firebase `uid` alone.
- [x] 5.2 Add authenticated client and work-order API tests covering same-organization CRUD, search, filters, pagination, and deletion integrity.
- [x] 5.3 Add cross-organization API tests proving clients, work orders, client summaries, reassignment, counters, and Calendar work-order retrieval remain isolated.
- [x] 5.4 Run API unit, integration, emulator, typecheck, and lint suites and resolve all organization-context regressions.

## 6. Cutover and Operations

- [x] 6.1 Document default organization provisioning, migration dry-run, conflict remediation, write-freeze, apply, verification, scoped deployment, and smoke-test commands.
- [x] 6.2 Document rollback to global mode before writes resume, the prohibition on configuration rollback afterward, and the legacy-data retention window.
- [x] 6.3 Deploy rules and indexes, run production dry-run against an explicitly selected Firebase project, and record resolved verification evidence.
- [x] 6.4 During the maintenance window, apply and verify migration, deploy organization mode, and smoke-test authorized members, forbidden non-members, CRUD integrity, filters, and Calendar loading before reopening writes.
