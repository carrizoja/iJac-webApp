#!/usr/bin/env bash
# Deploys production from the latest origin/main: the API to Cloud Run first,
# then the web to Firebase Hosting. Each part is checked before the next one
# starts, so a failed API deploy never ships a web that depends on it.
#
# Run from anywhere inside the repository, with gcloud and firebase logged in.
# See `scripts/deploy.sh --help`.
set -Eeuo pipefail

PROJECT="ijac-webapp"
REGION="southamerica-west1"
SERVICE="ijac-api"
IMAGE_REPO="southamerica-west1-docker.pkg.dev/ijac-webapp/ijac-api/ijac-api"
WEB_URL="https://app.ijac.com.ar"
EXPECTED_REPOSITORY_MODE="organization"

DEPLOY_API=true
DEPLOY_WEB=true
DRY_RUN=false
ASSUME_YES=false

usage() {
  cat <<EOF
Usage: scripts/deploy.sh [--api-only | --web-only] [--yes] [--dry-run]

Deploys the latest origin/main to production: the API (Cloud Run service
$SERVICE), then the web (Firebase Hosting, $WEB_URL).

Before deploying it checks that you are on main with no uncommitted changes,
pulls origin/main, and refuses local commits that are not on origin/main.

After the API deploy it checks that the new revision runs this commit's image,
serves 100% of traffic, runs with REPOSITORY_MODE=$EXPECTED_REPOSITORY_MODE,
and answers /api/health. The web is deployed only if all of that passes.

Options:
  --api-only   Deploy only the API
  --web-only   Deploy only the web
  --yes        Do not ask for confirmation
  --dry-run    Print the commands without running them
  -h, --help   Show this help
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
  local api_only=false web_only=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --api-only) api_only=true ;;
      --web-only) web_only=true ;;
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
  if [[ "$api_only" == true && "$web_only" == true ]]; then
    die "--api-only and --web-only cannot be combined"
  fi
  [[ "$api_only" == true ]] && DEPLOY_WEB=false
  [[ "$web_only" == true ]] && DEPLOY_API=false
  return 0
}

check_commands() {
  local -a required=(git curl)
  [[ "$DEPLOY_API" == true ]] && required+=(docker gcloud node)
  [[ "$DEPLOY_WEB" == true ]] && required+=(pnpm firebase)
  local -a missing=()
  local cmd
  for cmd in "${required[@]}"; do
    command -v "$cmd" > /dev/null 2>&1 || missing+=("$cmd")
  done
  [[ ${#missing[@]} -eq 0 ]] || die "Missing commands: ${missing[*]}"
}

# Leaves the working tree on the latest origin/main, or stops.
sync_main() {
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$branch" == main ]] || die "Deploy from main (current branch: $branch)."
  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "There are uncommitted changes. Commit or stash them first."
  fi

  log "Fetching origin/main"
  git fetch --quiet origin main
  if ! git merge-base --is-ancestor HEAD origin/main; then
    die "main has commits that are not on origin/main. Push them through a PR first."
  fi
  if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
    log "Updating main to origin/main"
    git merge --ff-only --quiet origin/main
  fi
}

confirm() {
  local -r tag="$1"
  local parts=()
  [[ "$DEPLOY_API" == true ]] && parts+=("API")
  [[ "$DEPLOY_WEB" == true ]] && parts+=("web")
  log "Commit: $(git log --oneline -1)"
  log "Parts: ${parts[*]}"
  [[ "$ASSUME_YES" == true || "$DRY_RUN" == true ]] && return 0

  local answer=""
  printf 'Deploy %s to production? [y/N] ' "$tag" >&2
  read -r answer || true
  [[ "$answer" == y || "$answer" == Y ]] || die "Cancelled."
}

# Checks the service after a deploy; prints every problem it finds.
verify_api() {
  local -r image="$1"
  local service
  service="$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT" --format=json)"

  local problems
  problems="$(
    IMAGE="$image" MODE="$EXPECTED_REPOSITORY_MODE" node -e '
      const service = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const container = service.spec.template.spec.containers[0];
      const latest = service.status.latestReadyRevisionName;
      const problems = [];
      if (container.image !== process.env.IMAGE) {
        problems.push(`the service runs ${container.image}, not ${process.env.IMAGE}`);
      }
      const mode = (container.env || []).find((e) => e.name === "REPOSITORY_MODE")?.value;
      if (mode !== process.env.MODE) {
        problems.push(`REPOSITORY_MODE is ${mode ?? "unset"}, expected ${process.env.MODE}`);
      }
      const latestPercent = (service.status.traffic || [])
        .filter((t) => t.latestRevision || t.revisionName === latest)
        .reduce((sum, t) => sum + (t.percent || 0), 0);
      if (latestPercent !== 100) {
        problems.push(`revision ${latest} serves ${latestPercent}%, not 100% of traffic`);
      }
      console.log(problems.join("\n"));
      console.error(`Revision ${latest} is serving.`);
    ' <<< "$service"
  )"
  if [[ -n "$problems" ]]; then
    printf '  - %s\n' "${problems//$'\n'/$'\n'  - }" >&2
    die "The API deploy did not come out as expected. The web was not deployed."
  fi

  local url
  url="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf8")).status.url)' <<< "$service")"
  curl -fsS -o /dev/null "$url/api/health" \
    || die "API health check failed at $url/api/health. The web was not deployed."
}

deploy_api() {
  local -r image="$1"
  log "Building and pushing $image"
  run docker build -f apps/api/Dockerfile -t "$image" .
  run docker push "$image"
  log "Deploying $SERVICE"
  run gcloud run deploy "$SERVICE" --image="$image" --region="$REGION" --project="$PROJECT"
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry run] verify %s: image, 100%% traffic, REPOSITORY_MODE, /api/health\n' "$SERVICE"
    return 0
  fi
  log "Checking $SERVICE"
  verify_api "$image"
}

deploy_web() {
  log "Building the web"
  run pnpm --filter @ijac/shared build
  run pnpm --filter @ijac/web build
  log "Deploying Firebase Hosting"
  run firebase deploy --only hosting --project="$PROJECT"
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry run] check %s answers\n' "$WEB_URL"
    return 0
  fi
  curl -fsS -o /dev/null "$WEB_URL" || die "$WEB_URL did not answer after the deploy."
}

main() {
  parse_args "$@"
  check_commands
  cd "$(git rev-parse --show-toplevel)"

  if [[ "$DEPLOY_WEB" == true && ! -f apps/web/.env.production ]]; then
    die "apps/web/.env.production is missing; the web build needs the production values."
  fi
  sync_main

  local tag
  tag="$(git rev-parse --short HEAD)"
  confirm "$tag"

  [[ "$DEPLOY_API" == true ]] && deploy_api "$IMAGE_REPO:$tag"
  [[ "$DEPLOY_WEB" == true ]] && deploy_web
  log "Done: $tag is live."
}

main "$@"
