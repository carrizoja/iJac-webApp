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

The API accepts a single browser origin (`CORS_ORIGIN`). Production values on Cloud Run service `ijac-api`:

| Variable | Value |
| --- | --- |
| `WEB_APP_URL` | `https://app.ijac.com.ar` |
| `CORS_ORIGIN` | `https://app.ijac.com.ar` |
| `GOOGLE_REDIRECT_URI` | `https://ijac-api-knmc6aqyia-tl.a.run.app/api/calendar/connection/oauth/callback` |

Change them with `gcloud run services update ijac-api --project=ijac-webapp --region=southamerica-west1 --update-env-vars=...`, which rolls out a new revision. The redirect URI must also be listed in the Google OAuth client's authorized redirect URIs.

### Google Calendar OAuth client

The Calendar connection uses the OAuth client set in `GOOGLE_CLIENT_ID`, which is `835784340797-11pmkptnd2dobnom10nt1j8pvm2h87jv.apps.googleusercontent.com`. **This client does not belong to `ijac-webapp`.** It lives in the Google Cloud project with number `835784340797`. The leading number of a client ID is the number of the project that owns it, so compare it with `gcloud projects describe ijac-webapp --format='value(projectNumber)'`. Edit the redirect URIs and secrets of this client in that project's console, under APIs & Services → Credentials.

- `GOOGLE_CLIENT_SECRET` must be the secret of that same client. Production reads it from Secret Manager `ijac-google-client-secret`, **version 2**, pinned on the service. To rotate it, add a new version, then repin the service:
  ```bash
  read -rsp "Client secret: " SECRET; echo; echo "length: ${#SECRET}"
  printf '%s' "$SECRET" | gcloud secrets versions add ijac-google-client-secret --project=ijac-webapp --data-file=- ; unset SECRET
  gcloud run services update ijac-api --region=southamerica-west1 --project=ijac-webapp \
    --update-secrets=GOOGLE_CLIENT_SECRET=ijac-google-client-secret:<new-version>
  ```
- If `CREDENTIAL_ENCRYPTION_KEY` changes, the stored refresh tokens can no longer be decrypted. Sync then marks the connection `reconnect_required`, and the user has to connect Google Calendar again.

When something fails, these symptoms point to the cause:

| Symptom | Cause |
| --- | --- |
| Google shows `Error 400: redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` is not in the authorized redirect URIs of the client named by `GOOGLE_CLIENT_ID`. Check the client's project first. |
| The app shows "No se pudo conectar Google Calendar" and the log reads `OAuth callback failed at stage: token_exchange` | `GOOGLE_CLIENT_SECRET` does not belong to that client. |
| Sync shows "No se pudo sincronizar el calendario" and the log reads `cannot be decrypted` | The stored credential was encrypted with another key. Reconnect Google Calendar. |

Because CORS allows only the custom domain, `https://ijac-webapp.web.app` serves the UI but its API calls are blocked; use `https://app.ijac.com.ar`.

The API service allows unauthenticated invocation (`allUsers` → `roles/run.invoker`); authorization is enforced in the application by the Firebase ID token guard.
