# Google Calendar Integration Security Policy

This document records the MVP decisions for Google Calendar authorization and credential handling.

## Account allowlist

- For MVP access, set `ALLOWED_DOMAIN` to the iJac Google Workspace domain (e.g., `ijac.com.ar`).
- Only authenticated Firebase users whose email matches that domain can access API endpoints.
- Broader account management or individual allowlisting is a future change.

## Target calendar

- The MVP synchronizes work orders to the connected user's primary Google Calendar.
- A dedicated calendar or selectable target calendar is deferred to a future change.

## OAuth redirect URLs

- Local development: `http://localhost:3001/api/calendar/connection/oauth/callback`
- Set `WEB_APP_URL` to the absolute frontend origin used after the callback (local development: `http://localhost:4321`).
- Production/staging URLs must be added to the Google Cloud Console OAuth client.
- The API validates the OAuth `state` nonce against a short-lived server-side transaction before exchanging the authorization code.

## Encryption key ownership

- `CREDENTIAL_ENCRYPTION_KEY` is a 32-byte base64 key stored only in Railway environment variables.
- It is never committed, logged, or returned to the browser.
- Key rotation must be planned before production expansion; rotating the key requires re-encrypting stored refresh credentials.

## Credential confidentiality

- Refresh tokens are encrypted with AES-256-GCM before being written to Firestore.
- The API redacts tokens, access tokens, client secrets, and encryption keys from logs and responses.
- The browser never sees a refresh token, access token, OAuth client secret, or encryption key.

## Synchronization behavior

- Synchronization is one-way from iJac work orders to the user's primary Google Calendar.
- Local CRUD commits before the best-effort Google Calendar call.
- Failures are stored in the `calendarEventMappings` collection and surfaced through the UI with a retry action.
- Two-way import, webhooks, and conflict resolution are out of scope for MVP.
