## Why

The Impeccable re-critique (26/40) found that the Clients page opens with a landing-page hero: an accent pill, a 6xl heading ("Clientes organizados para hacer crecer tu operación") and marketing copy. The page is an internal directory used daily by the owner, so the hero only pushes the client list below the fold. The page also nested a second `<main>` inside the application shell's `<main>`, giving screen readers two main landmarks.

## What Changes

- Replace the hero with the same plain heading and one-line description used by the other internal pages: "Clientes" / "Contactos, organizaciones y notas de tus clientes."
- Keep the breadcrumb and the rounded bordered client surface.
- Replace the page's inner `<main>` with a `<div>` so the application shell owns the single main landmark.
- Remove the unused hero translations and `.clients-hero` styles.

## Capabilities

### Modified Capabilities

- `frontend-experience-foundation`: the Clients page composition no longer requires an accent pill, a prominent hero heading or supporting marketing copy.

## Impact

- `apps/web/src/pages/clients/index.astro`, `apps/web/src/i18n/translations.ts`, `apps/web/src/styles/global.css`.
- Client search, create, edit, delete, validation and API behavior are unchanged.
