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

## Commands

Run from `apps/api`. Both commands build the API first, print the Firestore they will use, and write only with `--yes`:

```bash
pnpm migrate:organization -- --organization-id=ijac --dry-run
pnpm migrate:organization -- --organization-id=ijac --yes

pnpm provision:organization -- --organization-id=ijac --name="IJAC" \
  --admin-uid=<uid> --admin-email=<email> --dry-run
pnpm provision:organization -- --organization-id=ijac --name="IJAC" \
  --admin-uid=<uid> --admin-email=<email> --yes
```

- The `Target:` line must read `Target: PRODUCTION Firestore (project ijac-webapp)`. If it names the emulator, `FIRESTORE_EMULATOR_HOST` is still set (in the shell or in `apps/api/.env`).
- Both commands are safe to re-run. The migration skips documents it already copied. Provisioning never overwrites an existing organization document (or its profile) and keeps each membership's creation time.
- They load only config and Firebase, so the OAuth and encryption secrets are not needed.

## Runbook

Run from a workstation with Application Default Credentials for project `ijac-webapp` (`gcloud auth application-default login`). Make sure `FIRESTORE_EMULATOR_HOST` is **not** set, in the shell or in `apps/api/.env`, and `FIREBASE_PROJECT_ID=ijac-webapp`.

1. **Back up.** Export Firestore: `gcloud firestore export gs://<backup-bucket>/pre-org-cutover --project=ijac-webapp`.
2. **Dry run.** Run `migrate:organization` and `provision:organization` with `--dry-run`. Check the `Target:` line. Expect zero orphaned work orders and zero conflicts. Note the client, work-order and mapping counts.
3. **Pause writes.** Tell users not to edit for a few minutes. Writes made in global mode after step 4 would not be copied.
4. **Migrate.** Run `migrate:organization` with `--yes`. The counts should match step 2.
5. **Provision.** Run `provision:organization` with `--yes` for `ijac` with the owner's UID and email as `admin`.
6. **Verify the data.** In the Firebase console, check:
   - `organizations/ijac/clients` and `organizations/ijac/workOrders` have the same counts as the global collections;
   - `organizations/ijac/members/<uid>` has `role: admin`, `status: active`;
   - `activeOrganizationMemberships/<uid>` points to `ijac`.
7. **Switch.** Update the Cloud Run service `ijac-api` (region `southamerica-west1`) env var to `REPOSITORY_MODE=organization`. This creates a new revision.
   ```bash
   gcloud run services update ijac-api --region=southamerica-west1 --project=ijac-webapp \
     --update-env-vars=REPOSITORY_MODE=organization
   ```
8. **Verify the switch.** The smoke test below passes in either mode, so it cannot prove the switch. Check that the template shows the new value and that the newest revision gets all the traffic:
   ```bash
   gcloud run services describe ijac-api --region=southamerica-west1 --project=ijac-webapp \
     --format='value(spec.template.spec.containers[0].env)' | tr ';' '\n' | grep REPOSITORY_MODE
   gcloud run services describe ijac-api --region=southamerica-west1 --project=ijac-webapp \
     --format='yaml(status.latestReadyRevisionName,status.traffic)'
   ```
   Expect `'value': 'organization'`, and 100% of traffic on `latestReadyRevisionName`. If traffic is pinned to an older revision, run `gcloud run services update-traffic ijac-api --to-latest --region=southamerica-west1 --project=ijac-webapp`.
9. **Smoke test.** Sign in at https://app.ijac.com.ar:
   - clients and work orders list as before;
   - the calendar still shows events.
10. **Then deploy the payments feature** (API first, then web). After the API deploy, repeat the checks in step 8: a new revision must keep `REPOSITORY_MODE=organization` and get the traffic. Then open Settings. An admin sees the editable profile form below the "not configured yet" notice. If the notice appears without the form, the API is still in `global` mode.

## Rollback

Set `REPOSITORY_MODE=global` again on `ijac-api`. The global collections were never changed. Writes made in organization mode after step 7 stay in `organizations/ijac/...` and would need to be copied back by hand.
