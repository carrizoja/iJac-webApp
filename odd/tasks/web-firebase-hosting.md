# Web app on Firebase Hosting (app.ijac.com.ar)

## Objective

Serve the static Astro web app (`apps/web`) from Firebase Hosting in project `ijac-webapp`, reachable at `https://app.ijac.com.ar`, talking to the Cloud Run API.

## Why

The web app has no production host yet. Firebase Hosting keeps it in the same project as Firestore, Auth, and the API, with managed TLS and CDN.

## Scope

- Hosting configuration in `firebase.json` and default project in `.firebaserc`.
- Production build of `apps/web` with the production `PUBLIC_API_URL`.
- Deployment runbook in `docs/deployment/`.
- Out of scope for the repo (manual, owner-performed): Hostinger DNS records, Firebase console custom-domain setup, Firebase Auth authorized domains.

## Constraints

- Always pass `--project=ijac-webapp` explicitly.
- No secrets in the repo; web build values are public client config only.
- API `WEB_APP_URL` / `CORS_ORIGIN` change requires a new Cloud Run revision; confirm before deploying it.

## TDD

Mode: strict (global user config). Not applicable to these tasks: configuration and documentation only, no behavior code. Checks: `firebase.json` JSON validity, `pnpm --filter @ijac/web build`, HTTP smoke of the deployed URLs.

## Tasks

- [x] T1 Add Firebase Hosting config (`firebase.json` hosting block, `.firebaserc`) and deployment runbook. Route: inline (2 mechanical files + 1 doc).
- [ ] T2 Build web with production API URL and deploy hosting to `ijac-webapp.web.app`; smoke test.
- [ ] T3 Owner: add custom domain `app.ijac.com.ar` in Firebase console and the DNS records in Hostinger; wait for TLS.
- [ ] T4 Owner: add `app.ijac.com.ar` to Firebase Auth authorized domains (and OAuth client origins if restricted).
- [ ] T5 Update API `WEB_APP_URL` and `CORS_ORIGIN` to `https://app.ijac.com.ar` with a new Cloud Run revision (confirm first); verify login end to end.

## Acceptance criteria

- `https://app.ijac.com.ar` serves the login page over HTTPS.
- Google login works and the dashboard loads data from the API without CORS errors.

## Progress

- Branch: `feat/web-firebase-hosting`.
- T1 done: commit `ee4d7f8`; JSON parse and Prettier check passed.
- T2 blocked: `gcloud` needs interactive re-auth to read the Cloud Run API URL.

## Next step

T2 after `gcloud auth login`.
