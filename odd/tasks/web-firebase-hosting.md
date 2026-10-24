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
- [x] T2 Build web with production API URL and deploy hosting to `ijac-webapp.web.app`; smoke test.
- [x] T3 Owner: add custom domain `app.ijac.com.ar` in Firebase console and the DNS records in Hostinger; wait for TLS.
- [x] T4 Owner: add `app.ijac.com.ar` to Firebase Auth authorized domains (and OAuth client origins if restricted).
- [ ] T5 Update API `WEB_APP_URL` and `CORS_ORIGIN` to `https://app.ijac.com.ar` with a new Cloud Run revision (confirm first); verify login end to end.

## Acceptance criteria

- `https://app.ijac.com.ar` serves the login page over HTTPS.
- Google login works and the dashboard loads data from the API without CORS errors.

## Progress

- Branch: `feat/web-firebase-hosting`.
- T1 done: commit `ee4d7f8`; JSON parse and Prettier check passed.
- T2 done: built with `PUBLIC_API_URL=https://ijac-api-knmc6aqyia-tl.a.run.app/api` (gitignored `apps/web/.env.production`) and deployed to `https://ijac-webapp.web.app`. Smoke: `/`, `/clients`, `/work-orders`, `/work-orders/details`, `/calendar` 200; unknown path 404; security headers present.
- Owner made the API publicly invokable (`allUsers` → `roles/run.invoker`); `/api/health` 200, `/api/work-orders` 401 without a token.
- Finding: live API `CORS_ORIGIN` is `https://placeholder.invalid` and accepts a single origin, so browser API calls fail until T5.

- T3 done: Firebase custom domain `app.ijac.com.ar` HOST_ACTIVE / OWNERSHIP_ACTIVE; DNS resolves to Firebase. Certificate state `CERT_VALIDATING` at 2026-10-24 21:45 UTC (custom-domain HTTPS not yet usable).
- T4 done: Auth authorized domains include `app.ijac.com.ar` (verified via Identity Toolkit config).
- T5 partial: revision `ijac-api-00002-bkm` serves 100% with `WEB_APP_URL`/`CORS_ORIGIN=https://app.ijac.com.ar` and `GOOGLE_REDIRECT_URI` set to the API callback. Verified: health 200, unauthenticated 401, CORS preflight from `https://app.ijac.com.ar` 204 with matching origin. Pending: end-to-end Google login on the custom domain after TLS is issued; OAuth client redirect URI registration (owner).

## Next step

When the certificate is active, verify login and data loading on `https://app.ijac.com.ar`, then close T5.
