#!/usr/bin/env bash
# Tests for scripts/deploy.sh. Runs the real script against a throwaway git
# repository, with stub docker/gcloud/pnpm/firebase/curl commands on PATH that
# record their calls instead of touching production.
#
# Usage: bash scripts/deploy.test.sh
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy.sh"

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

# Creates a repository with an origin, the deploy script, and stub commands.
setup() {
  [[ -f "$DEPLOY_SCRIPT" ]] || fail "missing $DEPLOY_SCRIPT"
  cleanup
  WORK="$(mktemp -d)"
  export HOME="$WORK/home"
  mkdir -p "$HOME"
  git init -q --bare -b main "$WORK/origin.git"
  git clone -q "$WORK/origin.git" "$WORK/repo" 2>/dev/null
  cd "$WORK/repo"
  git config user.email test@example.test
  git config user.name test
  mkdir -p scripts apps/web
  cp "$DEPLOY_SCRIPT" scripts/deploy.sh
  printf 'PUBLIC_API_URL=https://api.example.test/api\n' > apps/web/.env.production
  printf 'apps/web/.env.production\n' > .gitignore
  printf 'app\n' > README.md
  git add -A
  git commit -q -m init
  git push -q origin main 2>/dev/null

  export CALLS="$WORK/calls.log"
  : > "$CALLS"
  export STUB_BIN="$WORK/bin"
  mkdir -p "$STUB_BIN"
  for cmd in docker pnpm firebase; do
    printf '#!/usr/bin/env bash\necho "%s $*" >> "$CALLS"\n' "$cmd" > "$STUB_BIN/$cmd"
  done
  cat > "$STUB_BIN/gcloud" <<'EOF'
#!/usr/bin/env bash
echo "gcloud $*" >> "$CALLS"
if [[ "$*" == *"run services describe"* ]]; then
  cat "$STUB_SERVICE_JSON"
fi
EOF
  cat > "$STUB_BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$CALLS"
[[ "${STUB_CURL_FAIL:-}" == "1" ]] && exit 22
exit 0
EOF
  chmod +x "$STUB_BIN"/*
  export PATH="$STUB_BIN:$PATH"

  export STUB_SERVICE_JSON="$WORK/service.json"
  service_json organization 100
}

# Writes the stub `gcloud run services describe` output.
service_json() {
  local -r mode="$1" percent="$2"
  local -r tag="$(git -C "$WORK/repo" rev-parse --short HEAD)"
  cat > "$STUB_SERVICE_JSON" <<EOF
{
  "spec": { "template": { "spec": { "containers": [ {
    "image": "southamerica-west1-docker.pkg.dev/ijac-webapp/ijac-api/ijac-api:$tag",
    "env": [ { "name": "REPOSITORY_MODE", "value": "$mode" } ]
  } ] } } },
  "status": {
    "url": "https://ijac-api.example.test",
    "latestReadyRevisionName": "ijac-api-00010-abc",
    "traffic": [ { "latestRevision": true, "percent": $percent, "revisionName": "ijac-api-00010-abc" } ]
  }
}
EOF
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

test_refuses_a_branch_other_than_main() {
  git checkout -q -b feature
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"Deploy from main"* ]] || fail "missing branch message: $output"
  [[ ! -s "$CALLS" ]] || fail "deployed anyway: $(cat "$CALLS")"
}

test_refuses_uncommitted_changes() {
  printf 'changed\n' >> README.md
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"uncommitted changes"* ]] || fail "missing message: $output"
  [[ ! -s "$CALLS" ]] || fail "deployed anyway"
}

test_refuses_local_commits_missing_from_origin() {
  printf 'local\n' >> README.md
  git commit -q -am local
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"not on origin/main"* ]] || fail "missing message: $output"
  [[ ! -s "$CALLS" ]] || fail "deployed anyway"
}

test_pulls_new_commits_from_origin_before_deploying() {
  git clone -q "$WORK/origin.git" "$WORK/other" 2>/dev/null
  (
    cd "$WORK/other"
    git config user.email test@example.test
    git config user.name test
    printf 'merged\n' >> README.md
    git commit -q -am merged
    git push -q origin main 2>/dev/null
  )
  local -r latest="$(git -C "$WORK/other" rev-parse --short HEAD)"
  service_json organization 100
  sed -i "s/ijac-api:[0-9a-f]*/ijac-api:$latest/" "$STUB_SERVICE_JSON"

  bash scripts/deploy.sh --yes > /dev/null 2>&1 || fail "deploy failed"
  [[ "$(git rev-parse --short HEAD)" == "$latest" ]] || fail "did not pull origin/main"
  grep -q "docker build .*:$latest " "$CALLS" || fail "did not build the pulled commit"
}

test_requires_the_web_production_env_file() {
  rm apps/web/.env.production
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"apps/web/.env.production"* ]] || fail "missing message: $output"
  [[ ! -s "$CALLS" ]] || fail "deployed anyway"
}

test_deploys_api_then_verifies_then_deploys_web() {
  local -r tag="$(git rev-parse --short HEAD)"
  bash scripts/deploy.sh --yes > /dev/null 2>&1 || fail "deploy failed"

  local -r image="southamerica-west1-docker.pkg.dev/ijac-webapp/ijac-api/ijac-api:$tag"
  mapfile -t calls < "$CALLS"
  local -a expected=(
    "docker build -f apps/api/Dockerfile -t $image ."
    "docker push $image"
    "gcloud run deploy ijac-api --image=$image --region=southamerica-west1 --project=ijac-webapp"
    "gcloud run services describe ijac-api --region=southamerica-west1 --project=ijac-webapp --format=json"
    "curl -fsS -o /dev/null https://ijac-api.example.test/api/health"
    "pnpm --filter @ijac/shared build"
    "pnpm --filter @ijac/web build"
    "firebase deploy --only hosting --project=ijac-webapp"
    "curl -fsS -o /dev/null https://app.ijac.com.ar"
  )
  [[ "${calls[*]}" == "${expected[*]}" ]] || fail "calls were:$(printf '\n    %s' "${calls[@]}")"
}

test_stops_before_the_web_when_the_api_is_not_in_organization_mode() {
  service_json global 100
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"REPOSITORY_MODE is global"* ]] || fail "missing message: $output"
  ! grep -q "firebase deploy" "$CALLS" || fail "deployed the web after a failed API check"
}

test_stops_when_the_new_revision_does_not_get_all_traffic() {
  service_json organization 0
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"100% of traffic"* ]] || fail "missing message: $output"
  ! grep -q "firebase deploy" "$CALLS" || fail "deployed the web"
}

test_stops_when_the_api_health_check_fails() {
  export STUB_CURL_FAIL=1
  local output
  if output=$(bash scripts/deploy.sh --yes 2>&1); then fail "expected failure"; fi
  [[ "$output" == *"health check failed"* ]] || fail "missing message: $output"
  ! grep -q "firebase deploy" "$CALLS" || fail "deployed the web"
}

test_api_only_and_web_only() {
  bash scripts/deploy.sh --yes --api-only > /dev/null 2>&1 || fail "api-only failed"
  grep -q "gcloud run deploy" "$CALLS" || fail "api-only did not deploy the API"
  ! grep -q "firebase" "$CALLS" || fail "api-only deployed the web"

  : > "$CALLS"
  bash scripts/deploy.sh --yes --web-only > /dev/null 2>&1 || fail "web-only failed"
  grep -q "firebase deploy" "$CALLS" || fail "web-only did not deploy the web"
  ! grep -q "docker\|gcloud" "$CALLS" || fail "web-only touched the API"
}

test_dry_run_prints_the_plan_without_running_it() {
  local output
  output=$(bash scripts/deploy.sh --dry-run 2>&1) || fail "dry run failed"
  [[ "$output" == *"[dry run] docker build"* ]] || fail "plan missing: $output"
  [[ "$output" == *"[dry run] firebase deploy"* ]] || fail "plan missing: $output"
  [[ ! -s "$CALLS" ]] || fail "dry run ran commands: $(cat "$CALLS")"
}

test_asks_for_confirmation_and_aborts_on_no() {
  local output
  if output=$(printf 'n\n' | bash scripts/deploy.sh 2>&1); then fail "expected abort"; fi
  [[ "$output" == *"Deploy "*" to production?"* ]] || fail "no prompt: $output"
  [[ ! -s "$CALLS" ]] || fail "deployed without confirmation"
}

test_rejects_unknown_and_conflicting_options() {
  if bash scripts/deploy.sh --bogus > /dev/null 2>&1; then fail "accepted --bogus"; fi
  if bash scripts/deploy.sh --api-only --web-only > /dev/null 2>&1; then fail "accepted both"; fi
  bash scripts/deploy.sh --help | grep -q "Usage:" || fail "no help"
}

for test in $(declare -F | awk '{print $3}' | grep '^test_'); do
  run_test "$test"
done

printf '\n%d passed, %d failed\n' "$PASSED" "$FAILED"
[[ "$FAILED" -eq 0 ]]
