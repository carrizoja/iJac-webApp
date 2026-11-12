#!/usr/bin/env bash
# Sets up automatic backups for the production Firestore database: a daily
# backup schedule kept for 14 days, and point-in-time recovery (PITR) for the
# last 7 days. Safe to rerun: it skips whatever is already in place.
#
# Run with gcloud logged in. See `scripts/setup-backups.sh --help` and
# docs/deployment/database-backups.md.
set -Eeuo pipefail

PROJECT="ijac-webapp"
DATABASE="(default)"
RETENTION="14d"

DRY_RUN=false
ASSUME_YES=false

usage() {
  cat <<EOF
Usage: scripts/setup-backups.sh [--yes] [--dry-run]

Sets up automatic backups for the Firestore database $DATABASE in project
$PROJECT:
  - a daily backup schedule, each backup kept for $RETENTION
  - point-in-time recovery (PITR), which keeps the last 7 days readable

It creates the schedule only if no daily schedule exists, and enables PITR
only if it is off, so running it again changes nothing.

Options:
  --yes        Do not ask for confirmation
  --dry-run    Print the commands without running them
  -h, --help   Show this help

Restoring: see docs/deployment/database-backups.md.
EOF
}

log() { printf '==> %s\n' "$*" >&2; }
die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry run] %s\n' "$*"
    return 0
  fi
  "$@"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) ASSUME_YES=true ;;
      --dry-run) DRY_RUN=true ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "Unknown option: $1"
        ;;
    esac
    shift
  done
}

confirm() {
  [[ "$ASSUME_YES" == true || "$DRY_RUN" == true ]] && return 0
  local answer=""
  printf 'Set up backups for %s in %s? [y/N] ' "$DATABASE" "$PROJECT" >&2
  read -r answer || true
  [[ "$answer" == y || "$answer" == Y ]] || die "Cancelled."
}

has_daily_schedule() {
  local schedules
  schedules="$(gcloud firestore backups schedules list \
    --database="$DATABASE" --project="$PROJECT" --format=json)"
  [[ "$schedules" == *'"dailyRecurrence"'* ]]
}

pitr_enabled() {
  local state
  state="$(gcloud firestore databases describe \
    --database="$DATABASE" --project="$PROJECT" \
    --format='value(pointInTimeRecoveryEnablement)')"
  [[ "$state" == POINT_IN_TIME_RECOVERY_ENABLED ]]
}

setup_schedule() {
  # A dry run makes no gcloud calls at all, so it prints the create command
  # without checking what exists.
  if [[ "$DRY_RUN" != true ]] && has_daily_schedule; then
    log "A daily backup schedule already exists. Leaving it as it is."
    return 0
  fi
  log "Creating the daily backup schedule ($RETENTION retention)"
  run gcloud firestore backups schedules create --database="$DATABASE" \
    --recurrence=daily --retention="$RETENTION" --project="$PROJECT"
}

setup_pitr() {
  if [[ "$DRY_RUN" != true ]] && pitr_enabled; then
    log "Point-in-time recovery is already enabled."
    return 0
  fi
  log "Enabling point-in-time recovery"
  run gcloud firestore databases update --database="$DATABASE" --enable-pitr --project="$PROJECT"
}

main() {
  parse_args "$@"
  command -v gcloud > /dev/null 2>&1 || die "Missing command: gcloud"
  confirm
  setup_schedule
  setup_pitr
  if [[ "$DRY_RUN" != true ]]; then
    log "Done. Check with:"
    log "  gcloud firestore backups schedules list --database='$DATABASE' --project=$PROJECT"
    log "  gcloud firestore databases describe --database='$DATABASE' --project=$PROJECT"
  fi
}

main "$@"
