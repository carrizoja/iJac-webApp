# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary: the owner of iJac IT Solutions (Buenos Aires), who is also the admin and the main day-to-day user. Uses the app mostly at a desktop computer in the office.
- Secondary: members (technicians) can sign in and view work, but rarely do. Only admins record or void payments.

## Product Purpose

iJac Operations is the internal tool for running the business's service jobs: keeping the client list, tracking work orders from open to completed, recording payments with printable receipts, and seeing scheduled work in Google Calendar. Success means the owner can see at a glance what needs attention and act on it without hunting through lists.

## Operating Context

- Work orders carry a client, status (open → in progress → completed, or cancelled), priority (low, normal, high, urgent), optional due date, and an optional total price in ARS or USD (stored in cents).
- Payments are recorded against a work order, never edited or deleted, only voided with a reason; each gets a sequential receipt number (e.g. `0001-00000042`) and a printable receipt marked "Documento no válido como factura".
- Work orders sync to the owner's Google Calendar once it is connected.
- The organization profile (business name, CUIT, address, phone) and branding images live in Settings and appear on receipts.

## Capabilities and Constraints

- Web app: Astro + React islands + Tailwind (`apps/web`), NestJS API on Cloud Run (`apps/api`), Firestore, Firebase Auth with Google sign-in.
- UI copy is Spanish (Argentine voseo) with an English toggle; light and dark themes.
- List endpoints are cursor-paginated; the web loads all pages and sorts in the browser.
- Payment balance (paid and remaining) is available per work order only; there is no aggregate "total owed" endpoint yet.

## Brand Commitments

- Name: iJac IT Solutions; the app is "iJac Operations".
- The current visual style (dark theme with glow accents) was confirmed to stay as it is (2026-11-06).

## Evidence on Hand

- Real data lives in production Firestore; there are no demo datasets, testimonials, or metrics in the repo. Do not fabricate figures.

## Product Principles

1. Show what needs attention first: overdue work and money owed outrank totals and history.
2. Every number links to the records behind it.
3. Money is never mixed across currencies.
4. Payments are a permanent record: nothing that looks like editing or deleting one.

## Accessibility & Inclusion

- Keyboard and screen-reader use must work: named controls, visible focus, focus kept inside dialogs (see PR #19).
