# Cloud Run API Deployment Runbook v1

This runbook plans the first production deployment of `@ijac/api` to Google Cloud Run. It does not authorize deployment or cloud-resource changes.

## Target

- Google Cloud project: `ijac-webapp` (always pass it explicitly to operational commands).
- Region: `southamerica-west1`, co-located with Firestore `(default)`.
- Billing: request-based (CPU allocated while processing requests).
- Scaling: minimum instances `0`, maximum instances `3`.
- Instance: `1` vCPU, `512 MiB` memory, concurrency `20`.
- Request timeout: `60s` initially; increase only from measured request behavior.
- Container port: Cloud Run-provided `PORT` (normally `8080`), bound on `0.0.0.0`.
- Health endpoint: `GET /api/health`; expected HTTP `200` with `{ "status": "ok", "timestamp": "..." }`.

## Runtime Environment

Required environment names (values are intentionally omitted):

- `PORT` (provided by Cloud Run; do not override during deployment)
- `NODE_ENV`
- `CORS_ORIGIN`
- `WEB_APP_URL`
- `ALLOWED_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `CREDENTIAL_ENCRYPTION_KEY`
- `REPOSITORY_MODE`
- `DEFAULT_ORGANIZATION_ID` (required operationally when organization migration/defaulting uses it)

`FIRESTORE_EMULATOR_HOST` is local/emulator-only and must never be set in production.

Do not set `FIREBASE_CLIENT_EMAIL` or `FIREBASE_PRIVATE_KEY` on Cloud Run. Firebase Admin receives `FIREBASE_PROJECT_ID` and uses Application Default Credentials from the revision's dedicated runtime service account. Local development and smoke checks may set both explicit credential variables as a pair when emulator or ADC access is unavailable; partial configuration fails startup validation.

`GOOGLE_REDIRECT_URI`, `WEB_APP_URL`, and `CORS_ORIGIN` remain provisional until both frontend and API production URLs exist. Finalize them together, update the Google OAuth client allowlist, and create a new Cloud Run revision.

## Runtime Identity

Run the service as a dedicated, non-default service account used only by this API. Grant only capabilities exercised by the runtime:

- Read, query, create, update, and delete the application's Firestore documents, including transactions and batched writes.
- Read the specific Secret Manager versions mounted as `GOOGLE_CLIENT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`.
- Verify Firebase ID token signatures for the configured project. The current `verifyIdToken` call does not request revocation checks or Firebase Authentication user administration, so do not grant broad Auth administration solely for token verification.

Select the narrowest predefined or custom IAM roles that provide those capabilities, and validate them against the deployed critical paths before traffic promotion. Exact role composition is an infrastructure decision because collection-level scope and organization policy may require a custom role; do not attach project-wide editor/owner roles.

## Secrets

Store `GOOGLE_CLIENT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` in Secret Manager. OAuth client identifiers may be normal environment configuration according to organization policy. Cloud Run must use its runtime identity for Firebase Admin; do not create or inject a Firebase service-account private key.

Grant the Cloud Run runtime service account access only to the required secret versions. Pin production revisions to explicit secret versions rather than `latest` so rollout and rollback remain reproducible. Never place secret values in shell arguments, repository files, image layers, build arguments, logs, or deployment documentation.

The deployment operator should use references equivalent to:

```text
GOOGLE_CLIENT_SECRET=projects/ijac-webapp/secrets/GOOGLE_CLIENT_SECRET/versions/<version>
CREDENTIAL_ENCRYPTION_KEY=projects/ijac-webapp/secrets/CREDENTIAL_ENCRYPTION_KEY/versions/<version>
```

## Release Procedure

1. Confirm Firestore `(default)` remains in `southamerica-west1` and deploy the Cloud Run revision in the same region.
2. Run `pnpm --filter @ijac/api test:container` from the repository root.
3. Build an immutable image from `apps/api/Dockerfile`, record its digest, and scan it before promotion.
4. Verify the explicit project is `ijac-webapp`, the dedicated runtime service account is selected with least-privilege access, no Firebase private-key environment variables are configured, and required Secret Manager references already exist. Do not create or modify them as an incidental deploy step.
5. Create a new revision with the target settings above, non-secret environment configuration, and Secret Manager references. Keep traffic on the current revision until validation passes.
6. Probe `GET /api/health`, inspect startup/shutdown logs, and run an authenticated critical-path check that does not mutate production data.
7. Shift traffic to the new revision gradually, then monitor error rate, latency, instance count, and cost.

## Rollback

Cloud Run revisions are the rollback boundary. Restore traffic to the last known-good revision; do not rebuild an old source tree or rotate secrets during an incident unless the secret itself is compromised. Confirm `/api/health` and critical paths after traffic restoration. Retain the failed revision and image digest for diagnosis, then remove them under the normal retention policy.

The source rollback boundary for this stage is the container-readiness work unit: `apps/api/Dockerfile`, `.dockerignore`, API bootstrap/shutdown changes, container and process smoke scripts, package-owned script registration, and this runbook. Reverting it does not require changing cloud resources.
