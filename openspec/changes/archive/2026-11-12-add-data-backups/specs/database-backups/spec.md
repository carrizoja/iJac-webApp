# Spec Delta

## Purpose

Keeps the production Firestore database recoverable after a mistake or an outage, through automatic backups, point-in-time recovery, and a documented restore procedure.

## ADDED Requirements

### Requirement: Daily backups are kept for 14 days
The production Firestore database SHALL have a daily backup schedule whose backups are kept for 14 days.

#### Scenario: Schedule exists after setup
- **WHEN** the setup script has run against project `ijac-webapp`
- **THEN** `gcloud firestore backups schedules list --database='(default)'` shows one daily schedule with 14-day retention

### Requirement: Point-in-time recovery is enabled
The production Firestore database SHALL have point-in-time recovery enabled, so its data can be read as it was at any minute in the last 7 days.

#### Scenario: PITR on after setup
- **WHEN** the setup script has run against project `ijac-webapp`
- **THEN** `gcloud firestore databases describe --database='(default)'` reports point-in-time recovery as enabled

### Requirement: Setup script is safe to run and rerun
`scripts/setup-backups.sh` SHALL print the commands without running them when given `--dry-run`, SHALL ask for confirmation before changing anything unless given `--yes`, SHALL explain itself with `--help`, and SHALL NOT create a second schedule when one with the same recurrence already exists.

#### Scenario: Dry run changes nothing
- **WHEN** an operator runs `scripts/setup-backups.sh --dry-run`
- **THEN** the script prints each `gcloud` command it would run, makes no change, and exits 0

#### Scenario: Rerun keeps one schedule
- **WHEN** an operator runs the script a second time with `--yes`
- **THEN** it reports that the daily schedule already exists, keeps exactly one daily schedule, and exits 0

#### Scenario: Unknown option
- **WHEN** an operator passes an option the script does not know
- **THEN** it prints the usage and exits with a non-zero status

### Requirement: Restore runbook
The repository SHALL contain a runbook in `docs/deployment/` that explains how to list backups, restore one into a new database, read data from a point in time, and copy restored data back into production.

#### Scenario: Operator finds the restore steps
- **WHEN** an operator needs to recover from a deleted record
- **THEN** the runbook gives the exact commands for both the scheduled-backup path and the point-in-time path, and warns not to overwrite the production database directly
