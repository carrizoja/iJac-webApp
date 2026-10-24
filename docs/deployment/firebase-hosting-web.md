# Web app on Firebase Hosting

The Astro web app (`apps/web`) is a static build served by Firebase Hosting in project `ijac-webapp`. Production domain: `https://app.ijac.com.ar`.

## Configuration

- `firebase.json` → `hosting` serves `apps/web/dist` with clean URLs, immutable caching for `/_astro/**`, and baseline security headers.
- `.firebaserc` sets `ijac-webapp` as the default project. Still pass `--project=ijac-webapp` explicitly.

## Build values

The build embeds public client configuration (no secrets):

| Variable | Production value |
| --- | --- |
| `PUBLIC_FIREBASE_API_KEY` | Firebase web app API key |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `ijac-webapp.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | `ijac-webapp` |
| `PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |
| `PUBLIC_API_URL` | Cloud Run API URL ending in `/api` (e.g. `https://<service>.run.app/api`) |

Put production overrides in `apps/web/.env.production` (gitignored). Astro loads it for `astro build` on top of `apps/web/.env`.

## Deploy

```bash
pnpm --filter @ijac/shared build
pnpm --filter @ijac/web build
firebase deploy --only hosting --project=ijac-webapp
```

Smoke test `https://ijac-webapp.web.app` and the custom domain: the login page loads and Google sign-in completes.

## Custom domain (one-time)

1. Firebase console → Hosting → Add custom domain → `app.ijac.com.ar`.
2. In Hostinger hPanel → Domains → `ijac.com.ar` → DNS, add exactly the records Firebase shows (TXT for verification, then A records for host `app`). Remove any existing `app` A/AAAA/CNAME record first.
3. Wait for Firebase to verify and issue the TLS certificate.
4. Firebase console → Authentication → Settings → Authorized domains → add `app.ijac.com.ar`. If the Google OAuth client restricts JavaScript origins, add `https://app.ijac.com.ar` there too.

## API alignment

Set the Cloud Run API `WEB_APP_URL` and `CORS_ORIGIN` to `https://app.ijac.com.ar` and roll out a new revision (see `cloud-run-api-v1.md`). Until then, browser calls from the custom domain fail CORS.
