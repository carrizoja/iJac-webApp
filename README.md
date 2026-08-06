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
