# Database backups and restore

The production data lives in the Firestore database `(default)` of project
`ijac-webapp`. Two Google Cloud features keep it recoverable:

| Feature | What it keeps | Use it for |
|---|---|---|
| Daily backup schedule | One full backup per day, each kept for 14 days | Recovering after a bad deploy, a broken migration, or damage noticed late |
| Point-in-time recovery (PITR) | The database as it was at any minute in the last 7 days | Undoing a wrong delete or edit from the last few days |

Both restore into a **new** database. Neither one can overwrite `(default)` by
itself, and you should never try to make it do so. Copy back only what you need
(see [Copy data back into production](#copy-data-back-into-production)).

For a copy that you keep yourself, outside Google Cloud, an admin can also
download the data from **Configuración → Respaldo de datos** in the app, as
Excel or JSON. That download is not a restore source for Firestore.

## Set up (once)

```bash
scripts/setup-backups.sh --dry-run   # shows the gcloud commands
scripts/setup-backups.sh             # asks for confirmation, then runs them
```

The script creates the daily schedule only if no daily schedule exists, and
enables PITR only if it is off, so running it again is harmless. Check the
result:

```bash
gcloud firestore backups schedules list --database='(default)' --project=ijac-webapp
# one entry with dailyRecurrence and retention 1209600s (14 days)

gcloud firestore databases describe --database='(default)' --project=ijac-webapp \
  --format='value(pointInTimeRecoveryEnablement,earliestVersionTime,locationId)'
# POINT_IN_TIME_RECOVERY_ENABLED, the earliest readable time, and the location
```

**Cost:** backups and PITR are billed as storage, in proportion to the size of
the database. At this app's size that is a few cents a month. Check
*Billing → Reports* filtered to Firestore after the first week.

## Practice a restore

A backup that has never been restored is only a hope. After setup, and then
every few months, restore the latest backup into a scratch database
(see [Restore from a daily backup](#restore-from-a-daily-backup)), open it in the
console, check that recent orders are there, and delete it.

## Restore from a daily backup

1. Find the location and the backup:

   ```bash
   LOCATION="$(gcloud firestore databases describe --database='(default)' \
     --project=ijac-webapp --format='value(locationId)')"
   gcloud firestore backups list --location="$LOCATION" --project=ijac-webapp \
     --format='table(name, database, snapshotTime, state)'
   ```

   `snapshotTime` is when the backup was taken. Pick the latest one from
   before the damage.

2. Restore it into a new database. The name must be new, lowercase, and 4–63
   characters, for example `restore-20261112`:

   ```bash
   gcloud firestore databases restore \
     --source-backup="projects/ijac-webapp/locations/$LOCATION/backups/<BACKUP_ID>" \
     --destination-database=restore-20261112 \
     --project=ijac-webapp
   ```

3. Open the new database in the Firebase console (Firestore → database
   selector) and find the data you need under `organizations/<org>/…`.

## Restore from a point in time (last 7 days)

Clone the database as it was at a given minute into a new database. The time
must be a whole minute, in UTC, and not older than `earliestVersionTime`:

```bash
gcloud firestore databases clone \
  --source-database='projects/ijac-webapp/databases/(default)' \
  --snapshot-time=2026-11-12T13:05:00Z \
  --destination-database=restore-20261112-1305 \
  --project=ijac-webapp
```

Argentina is UTC−3, so 10:05 local time is `13:05:00Z`.

If you only need a file copy instead of a database, export from that minute to
a bucket:

```bash
gcloud firestore export gs://<backup-bucket>/pitr-20261112-1305 \
  --database='(default)' --snapshot-time=2026-11-12T13:05:00Z --project=ijac-webapp
```

## Copy data back into production

The restored database is a separate copy. The app keeps reading `(default)`.

- **A few documents** (a deleted client, an order, a payment): open the
  document in the restored database, and recreate it with the same ID and
  fields in `(default)` from the console. Check the related records too. For
  example, a deleted order may also need its payments.
- **A whole collection:** export it from the restored database and import it
  into `(default)`:

  ```bash
  gcloud firestore export gs://<backup-bucket>/copy-back-20261112 \
    --database=restore-20261112 --collection-ids=workOrders --project=ijac-webapp
  gcloud firestore import gs://<backup-bucket>/copy-back-20261112 \
    --database='(default)' --project=ijac-webapp
  ```

  **Warning:** `--collection-ids` names a collection *group*, so this copies
  `workOrders` for **every organization**. Import overwrites documents that
  have the same ID and keeps documents that exist only in `(default)`, so
  changes made after the backup are lost for those documents. Run it only
  after you have checked what it will overwrite.

Never delete or recreate `(default)` to "restore" it.

## Clean up

Delete the scratch database when you are done. Databases are billed while they
exist:

```bash
gcloud firestore databases delete --database=restore-20261112 --project=ijac-webapp
```

## Turn it off (rollback)

```bash
gcloud firestore backups schedules list --database='(default)' --project=ijac-webapp
gcloud firestore backups schedules delete --database='(default)' \
  --backup-schedule=<SCHEDULE_ID> --project=ijac-webapp
gcloud firestore databases update --database='(default)' --no-enable-pitr --project=ijac-webapp
```

Neither command touches stored data. Backups already taken stay until their
retention ends.
