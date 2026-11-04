# Organization-mode cutover (task 4.0)

Production runs `REPOSITORY_MODE=global`. In that mode no role is resolved, so admin-only routes (organization profile, recording and voiding payments) always return 403. This runbook moves production to `REPOSITORY_MODE=organization` with one organization, `ijac`, and the owner as `admin`.

## What changes in Firestore

| Data | Global mode (today) | Organization mode (after) |
|---|---|---|
| Clients | `clients/{id}` | `organizations/ijac/clients/{id}` |
| Work orders | `workOrders/{id}` | `organizations/ijac/workOrders/{id}` |
| Calendar event mappings | `calendarEventMappings/{id}` | `organizations/ijac/calendarEventMappings/{workOrderId}` |
| Organization + members | none | `organizations/ijac`, `organizations/ijac/members/{uid}` |
| Membership locator | none | `activeOrganizationMemberships/{uid}` |
| Calendar connections, OAuth transactions | `calendarConnections/{uid}`, `oauthTransactions/{id}` | unchanged (keyed by user, not organization) |

The migration **copies**. It never deletes the global documents, so switching the env var back to `global` is the rollback.

Payments, the receipt counter and the organization profile do not exist in production yet. Run this cutover **before** deploying the payments feature, so nothing has to be moved for them.

## Code prerequisites

These must be fixed and merged before the cutover:

1. **Provisioning writes timestamps as strings.** `OrganizationProvisioningService` stores `createdAt` and `updatedAt` as ISO strings. The membership repository passes them to `toIsoString`, which expects a Firestore `Timestamp` or `Date` and calls `.toISOString()` on the string. That throws, so every authenticated request would fail. Write Firestore timestamps instead.
2. **Provisioning overwrites the organization document.** `orgRef.set(...)` replaces the whole document, which would erase the `profile` field if provisioning is ever re-run. Create the organization document only when it does not exist (or merge), and keep membership writes idempotent.
3. **No way to run either tool.** Add API scripts:
   - `pnpm --filter @ijac/api migrate:organization -- --dry-run --organization-id=ijac`
   - `pnpm --filter @ijac/api provision:organization -- --organization-id=ijac --name="..." --admin-uid=<uid> --admin-email=<email>`
   Both should print what they would write with `--dry-run`, and refuse to run against the emulator or production unless the target project is printed and confirmed.
4. **Migration is not safely re-runnable.** `documentsMatch` compares field values with `===`, so two equal Firestore `Timestamp`s count as different. A second run after a partial failure reports every copied document as a conflict. Compare timestamps by value (`isEqual`) so a re-run skips documents it already copied.

## Runbook

Run from a workstation with Application Default Credentials for project `ijac-webapp` (`gcloud auth application-default login`). Make sure `FIRESTORE_EMULATOR_HOST` is **not** set.

1. **Back up.** Export Firestore: `gcloud firestore export gs://<backup-bucket>/pre-org-cutover --project=ijac-webapp`.
2. **Dry run.** Run `migrate:organization --dry-run --organization-id=ijac`. Expect zero orphaned work orders and zero conflicts. Note the client, work-order and mapping counts.
3. **Pause writes.** Tell users not to edit for a few minutes. Writes made in global mode after step 4 would not be copied.
4. **Migrate.** Run the same command without `--dry-run`. The counts should match step 2.
5. **Provision.** Run `provision:organization` for `ijac` with the owner's UID and email as `admin`.
6. **Verify the data.** In the Firebase console, check:
   - `organizations/ijac/clients` and `organizations/ijac/workOrders` have the same counts as the global collections;
   - `organizations/ijac/members/<uid>` has `role: admin`, `status: active`;
   - `activeOrganizationMemberships/<uid>` points to `ijac`.
7. **Switch.** Update the Cloud Run service `ijac-api` (region `southamerica-west1`) env var to `REPOSITORY_MODE=organization`. This creates a new revision.
8. **Smoke test.** Sign in at https://app.ijac.com.ar:
   - clients and work orders list as before;
   - the calendar still shows events;
   - Settings shows an editable profile form (admin).
9. **Then deploy the payments feature** (API first, then web).

## Rollback

Set `REPOSITORY_MODE=global` again on `ijac-api`. The global collections were never changed. Writes made in organization mode after step 7 stay in `organizations/ijac/...` and would need to be copied back by hand.
