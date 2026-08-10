# iJac Operations

Internal operations web application for **iJac IT Solutions**.

This is a portfolio-quality, spec-driven monorepo containing an authenticated client and work-order management system with Google Calendar synchronization.

## Workspace

- `apps/web` — Astro + React islands + Tailwind CSS, intended for Vercel.
- `apps/api` — NestJS API intended for Railway.
- `packages/shared` — Framework-independent TypeScript domain contracts.
- `openspec/` — Spec-driven planning artifacts.

## Prerequisites

- Node.js >= 22
- pnpm 10.x (via Corepack)
- A Firebase project with Authentication and Firestore enabled
- Google OAuth client credentials with Calendar API access

## Quick start

```bash
# Enable pnpm via Corepack
corepack enable

# Install workspace dependencies
pnpm install

# Copy environment templates and fill in real values
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Build the shared package
pnpm --filter @ijac/shared build

# Run both apps in development
pnpm dev
```

The web app runs on `http://localhost:4321` and the API on `http://localhost:3001/api`.

### Verifying the API

```bash
# Run only the API in development
pnpm --filter @ijac/api dev

# Check runtime readiness (public, no token required)
curl http://localhost:3001/api/health
# -> { "status": "ok", "timestamp": "<ISO 8601>" }

# Full built-process smoke check (build first, no Firebase/Google network calls)
pnpm --filter @ijac/api build
pnpm --filter @ijac/api test:smoke
```

The API validates its environment at startup and exits with an actionable error naming any missing or invalid variable.

## Root commands

```bash
pnpm lint        # Lint all workspaces
pnpm typecheck   # Type-check all workspaces
pnpm test        # Run all workspace tests
pnpm test:ci     # Run CI test suites
pnpm build       # Build all workspaces
```

Turborepo orchestrates the task graph and caches outputs across workspaces.

## Application boundaries

- The browser only uses the Firebase client SDK for authentication.
- All client, work-order, calendar, and OAuth persistence is performed by the NestJS API using Firebase Admin.
- Firestore security rules deny direct browser access to application data and credentials.
- The web application sends the current Firebase ID token to the API on every business request.

## Environment variables

### `apps/web`

See `apps/web/.env.example`. All variables are browser-safe and prefixed with `PUBLIC_`.

### `apps/api`

See `apps/api/.env.example`. These values are server-only and must never be committed.

See `docs/calendar-security-policy.md` for the MVP account allowlist, target calendar, OAuth redirect URLs, and encryption key ownership policy.

Key secrets:

- `FIREBASE_PRIVATE_KEY` — Firebase Admin service account private key.
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret.
- `CREDENTIAL_ENCRYPTION_KEY` — 32-byte base64 key for encrypting stored refresh credentials.

Generate a new encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Local Firebase emulator

To develop against the Firebase emulator, set `FIRESTORE_EMULATOR_HOST=localhost:8080` in `apps/api/.env` and start the emulator suite from your Firebase project.

## Firestore resource deployment

The client search query requires the composite index declared in `firestore.indexes.json`. Deploy Firestore resources to an explicit project so local Firebase aliases cannot target the wrong environment:

```bash
# Confirm the intended project ID first
firebase projects:list

# Deploy the versioned rules and indexes
firebase deploy --only firestore:rules,firestore:indexes --project <project-id>

# Confirm the default database contains the deployed index definitions
firebase firestore:indexes --project <project-id>
```

Composite index creation is asynchronous. In the Firebase console, open **Firestore Database > Indexes** for `<project-id>` and wait until the `clients` index with `searchPrefixes` (`CONTAINS`) and `updatedAt` (`DESCENDING`) reports **Enabled**. Do not verify client search while the index is still building.

After the API is using that Firebase project, verify matching and empty searches with a current Firebase ID token:

```bash
export FIREBASE_ID_TOKEN='<current-id-token>'

curl --fail-with-body \
  --header "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "http://localhost:3001/api/clients?search=acme"

curl --fail-with-body \
  --header "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "http://localhost:3001/api/clients?search=no-client-should-match-this"
```

Both requests must return HTTP 200. Matching results remain ordered by `updatedAt` descending; a non-matching search returns an empty `items` array.

## Google Calendar integration

The MVP uses one-way, user-initiated synchronization from iJac work orders to the connected user's Google Calendar. Two-way sync is intentionally out of scope for this change.

Connecting Calendar requires a separate server-side Google OAuth flow because Firebase's browser SDK does not expose a durable refresh token. The API stores refresh credentials encrypted at rest.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, tests, and production builds for both applications on every push and pull request. Deployment steps are intentionally absent.

## Security notes

- Never commit `.env` files or service-account JSON.
- Keep `CREDENTIAL_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`, and `FIREBASE_PRIVATE_KEY` in Railway/Vercel environment secrets only.
- Use `ALLOWED_DOMAIN` to restrict MVP access to the iJac Google Workspace domain.

## Deployment (future change)

- `apps/web` → Vercel
- `apps/api` → Railway

These pipelines will be added in a separate change once the MVP is verified end-to-end.
