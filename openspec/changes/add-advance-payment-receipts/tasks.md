## 1. Slice 1 — Organization profile (PR 1)

- [x] 1.1 Add `isValidCuit` and `normalizeTaxId` to `packages/shared` with table-driven tests (valid/invalid check digits, hyphens and dots, wrong lengths)
- [x] 1.2 Add `OrganizationProfile` type and `Currency`/`OrganizationProfileStatus` shared types
- [x] 1.3 Add `@RequireRole` decorator and `RolesGuard` in `apps/api/src/auth` with tests for admin allowed, member 403, and missing role
- [x] 1.4 Add organization-profile repository (both `REPOSITORY_MODE` paths) and service with tests, including the not-configured response
- [x] 1.5 Add `GET /organization/profile` (member) and `PUT /organization/profile` (admin) with DTO validation and controller tests
- [x] 1.6 Add web API client functions and a Settings page with profile form: editable for admins, read-only for members, with ES/EN translations and component tests
- [x] 1.7 Add Settings navigation entry and verify lint, typecheck, tests, and build pass

## 2. Slice 2 — Client tax identifier (PR 2)

- [x] 2.1 Add optional `taxId` to shared `Client` type
- [x] 2.2 Accept, validate (7–11 digits, CUIT check digit when 11), normalize, and clear `taxId` in client DTOs and repository, with service and repository tests
- [x] 2.3 Add tax ID input to the client form and show it in client details, with ES/EN translations and component tests
- [x] 2.4 Verify lint, typecheck, tests, and build pass

## 3. Slice 3 — Work-order pricing (PR 3)

- [x] 3.1 Add optional `totalPriceMinor` and `currency` to shared `WorkOrder`, plus `formatMoney(minor, currency)` with `es-AR` tests
- [x] 3.2 Validate price/currency pairing (non-negative integer, `ARS`|`USD`, currency required with price) in work-order DTOs and repository, with tests
- [x] 3.3 Add a money input helper in the web (parse `150.000,50` → minor units) with tests
- [x] 3.4 Add total price and currency inputs to the work-order form and show the total in work-order details, with ES/EN translations and component tests
- [x] 3.5 Verify lint, typecheck, tests, and build pass

## 4. Slice 4 — Payments, balance, and receipts (PR 4, may split API/web if over budget)

- [ ] 4.0 Prerequisite (ops, before deploying slices 1 and 4 to production): cut production over from `REPOSITORY_MODE=global` to `organization` using the existing migration tooling (preview → migrate → verify → switch env) and provision the organization with the owner as `admin`; in `global` mode no role is resolved, so admin-only routes always return 403
- [x] 4.1 Add shared `Payment`, `PaymentMethod`, `PaymentStatus`, `PaymentConcept`, and `WorkOrderBalance` types
- [x] 4.2 Add `computeBalance` and `formatReceiptNumber` to `packages/shared` with tests (voided excluded, zero payments, `0001-00000042`)
- [x] 4.3 Add `amountToSpanishWords` to `packages/shared` with table-driven tests covering the edge numbers listed in design.md and both currencies
- [x] 4.4 Add payment repository with the record transaction (counter increment, preconditions, snapshots, concept) for both `REPOSITORY_MODE` paths, with tests for numbering, overpay, unpriced, cancelled, and profile-not-configured
- [x] 4.5 Add the void operation (reason required, double-void conflict, audit fields) with tests
- [x] 4.6 Add payment service and controller: `GET /work-orders/:id/payments` (member), `POST` record and `POST .../void` (admin), with organization-isolation and 403 tests
- [x] 4.7 Enforce currency lock and minimum total in the work-order update path through a transaction that reads active payments, with tests for each update scenario in the spec
- [x] 4.8 Add a payments panel to work-order details (balance summary, payment list, admin-only record and void dialogs, unpriced hint, link to Settings when the profile is missing), with ES/EN translations and component tests
- [x] 4.9 Add a `PaymentReceipt` component in fixed Spanish (issuer, number, date, client with optional tax ID, amount in figures and words, method, concept, title, "Documento no válido como factura", "ANULADO" mark with reason) with tests
- [x] 4.10 Add a receipt print view reusing the print-hide pattern so only the receipt prints, with a test asserting `window.print` is triggered
- [x] 4.11 Confirm `firestore.rules` default deny covers `payments` and `counters` (no rule change), and add a rules note to deployment docs
- [x] 4.13 Add idempotent payment recording: client-generated UUID key, deduplicated inside the record transaction, with API and web tests
- [x] 4.14 Add distinct error codes for payment business-rule rejections and map them in the payments panel instead of matching message text
- [x] 4.15 Show the overpayment message only for the overpayment code; show an invalid-amount message for other amount errors
- [x] 4.16 Reject idempotent replays whose payload differs from the original payment, with tests
- [x] 4.12 Verify lint, typecheck, tests, and build pass and manually walk the full flow locally (profile → priced job → advance → settlement → void → reprint)

## 5. Follow-ups found in the manual walk-through

- [x] 5.1 Link each work-order list row to its details page; today only the calendar links there, so the payments panel is otherwise unreachable
- [ ] 5.2 Show the client tax ID on the receipt with CUIT hyphens (`30-71234567-1`), matching the issuer CUIT
- [ ] 5.3 Hide browser print headers and footers on the receipt (date, title, URL), for example with `@page { margin: 0 }` and inner padding
