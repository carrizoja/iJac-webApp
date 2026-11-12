#!/usr/bin/env bash
# Tests for scripts/setup-backups.sh. Runs the real script with a stub gcloud
# on PATH that records its calls and answers from files, so nothing reaches
# Google Cloud.
#
# Usage: bash scripts/setup-backups.test.sh
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SETUP_SCRIPT="$SCRIPT_DIR/setup-backups.sh"

PASSED=0
FAILED=0
WORK=""

cleanup() {
  if [[ -n "$WORK" && -d "$WORK" ]]; then
    rm -rf -- "$WORK"
  fi
}
trap cleanup EXIT

# Each test runs in its own subshell, where `set -e` does not apply (it is
# ignored inside `if`), so a failed check exits that subshell explicitly.
fail() {
  printf '  FAIL: %s\n' "$*" >&2
  exit 1
}

# Creates a stub gcloud. STUB_SCHEDULES is what `schedules list` prints, and
# STUB_PITR is what `databases describe` prints.
setup() {
  [[ -f "$SETUP_SCRIPT" ]] || fail "missing $SETUP_SCRIPT"
  cleanup
  WORK="$(mktemp -d)"
  export CALLS="$WORK/calls.log"
  : > "$CALLS"
  export STUB_SCHEDULES="$WORK/schedules.json"
  printf '[]\n' > "$STUB_SCHEDULES"
  export STUB_PITR="$WORK/pitr.txt"
  printf 'POINT_IN_TIME_RECOVERY_DISABLED\n' > "$STUB_PITR"
  mkdir -p "$WORK/bin"
  cat > "$WORK/bin/gcloud" <<'EOF'
#!/usr/bin/env bash
echo "gcloud $*" >> "$CALLS"
if [[ "$*" == *"backups schedules list"* ]]; then
  cat "$STUB_SCHEDULES"
elif [[ "$*" == *"databases describe"* ]]; then
  cat "$STUB_PITR"
fi
EOF
  chmod +x "$WORK/bin/gcloud"
  export PATH="$WORK/bin:$PATH"
}

run_test() {
  local -r name="$1"
  printf '%s\n' "$name"
  if ( setup && "$name" ); then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
}

# --- tests -------------------------------------------------------------------

test_help_exits_zero() {
  local out
  out="$(bash "$SETUP_SCRIPT" --help)" || fail "--help exited non-zero"
  [[ "$out" == *"Usage: scripts/setup-backups.sh"* ]] || fail "no usage in: $out"
  [[ ! -s "$CALLS" ]] || fail "--help called gcloud"
}

test_unknown_option_fails_with_usage() {
  local err status=0
  err="$(bash "$SETUP_SCRIPT" --bogus 2>&1)" || status=$?
  [[ "$status" -ne 0 ]] || fail "unknown option exited 0"
  [[ "$err" == *"Usage:"* ]] || fail "no usage in: $err"
  [[ "$err" == *"Unknown option: --bogus"* ]] || fail "no error in: $err"
}

test_dry_run_prints_commands_and_changes_nothing() {
  local out
  out="$(bash "$SETUP_SCRIPT" --dry-run 2>&1)" || fail "--dry-run exited non-zero"
  [[ ! -s "$CALLS" ]] || fail "--dry-run called gcloud: $(cat "$CALLS")"
  [[ "$out" == *"[dry run] gcloud firestore backups schedules create --database=(default) --recurrence=daily --retention=14d --project=ijac-webapp"* ]] \
    || fail "no schedule command in: $out"
  [[ "$out" == *"[dry run] gcloud firestore databases update --database=(default) --enable-pitr --project=ijac-webapp"* ]] \
    || fail "no PITR command in: $out"
}

test_creates_schedule_and_enables_pitr() {
  bash "$SETUP_SCRIPT" --yes > /dev/null 2>&1 || fail "--yes exited non-zero"
  grep -q "backups schedules create --database=(default) --recurrence=daily --retention=14d --project=ijac-webapp" "$CALLS" \
    || fail "schedule not created: $(cat "$CALLS")"
  grep -q "databases update --database=(default) --enable-pitr --project=ijac-webapp" "$CALLS" \
    || fail "PITR not enabled: $(cat "$CALLS")"
}

test_rerun_keeps_one_daily_schedule() {
  printf '[{"name": "projects/ijac-webapp/databases/(default)/backupSchedules/abc", "dailyRecurrence": {}, "retention": "1209600s"}]\n' > "$STUB_SCHEDULES"
  printf 'POINT_IN_TIME_RECOVERY_ENABLED\n' > "$STUB_PITR"
  local out
  out="$(bash "$SETUP_SCRIPT" --yes 2>&1)" || fail "rerun exited non-zero"
  ! grep -q "schedules create" "$CALLS" || fail "created a second schedule"
  ! grep -q "databases update" "$CALLS" || fail "updated PITR that was already on"
  [[ "$out" == *"A daily backup schedule already exists"* ]] || fail "no notice in: $out"
  [[ "$out" == *"Point-in-time recovery is already enabled"* ]] || fail "no PITR notice in: $out"
}

test_weekly_schedule_does_not_count_as_daily() {
  printf '[{"name": "projects/ijac-webapp/databases/(default)/backupSchedules/w", "weeklyRecurrence": {"day": "MONDAY"}}]\n' > "$STUB_SCHEDULES"
  bash "$SETUP_SCRIPT" --yes > /dev/null 2>&1 || fail "--yes exited non-zero"
  grep -q "schedules create" "$CALLS" || fail "daily schedule not created next to a weekly one"
}

test_refuses_without_confirmation() {
  local status=0
  bash "$SETUP_SCRIPT" < /dev/null > /dev/null 2>&1 || status=$?
  [[ "$status" -ne 0 ]] || fail "ran without confirmation"
  ! grep -q -e "schedules create" -e "databases update" "$CALLS" || fail "changed something without confirmation"
}

test_confirmation_yes_proceeds() {
  printf 'y\n' | bash "$SETUP_SCRIPT" > /dev/null 2>&1 || fail "answering y failed"
  grep -q "schedules create" "$CALLS" || fail "schedule not created after y"
}

run_test test_help_exits_zero
run_test test_unknown_option_fails_with_usage
run_test test_dry_run_prints_commands_and_changes_nothing
run_test test_creates_schedule_and_enables_pitr
run_test test_rerun_keeps_one_daily_schedule
run_test test_weekly_schedule_does_not_count_as_daily
run_test test_refuses_without_confirmation
run_test test_confirmation_yes_proceeds

printf '\n%d passed, %d failed\n' "$PASSED" "$FAILED"
[[ "$FAILED" -eq 0 ]]
