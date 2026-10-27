## Context

See proposal.md for motivation. Current state that shapes the approach:

- The shared domain (`packages/shared/src/domain.ts`) defines `WorkOrder` and `Client` with no monetary fields.
- The API (`apps/api`) is NestJS on Cloud Run and uses Firebase Admin. Repositories resolve their collection through `REPOSITORY_MODE` (`global` → root collections, `organization` → `organizations/{orgId}/...`). `OrganizationAuthGuard` puts `organizationId` and `role` on the request, but no route checks the role yet.
- `firestore.rules` deny all direct browser access (`{document=**}` default deny). Every authorization decision lives in the API.
- The organization document holds only `name`, `createdAt` and `updatedAt`, written by `OrganizationProvisioningService`.
- The web app (`apps/web`) is Astro with React islands. `WorkOrderDetails` already prints through `window.print()` and print-scoped CSS classes (`work-order-print-document`, `work-order-print-hidden`).

## Goals / Non-Goals

**Goals:**
- Money arithmetic is exact and identical in the API and the web.
- Receipt numbers are gap-free under concurrency and never reused.
- A printed receipt can be reprinted later with the same content, independent of later edits.

**Non-Goals:**
- AFIP electronic invoicing, CAE or any fiscal document.
- Currency conversion, mixed-currency jobs or exchange-rate tracking.
- Multiple points of sale (the `0001` prefix is fixed).
- Emailing receipts or server-side PDF generation.
- Refunds or negative payments (a mistaken payment is voided and re-recorded).

## Decisions

### D1. Money as integer minor units plus a currency code
Store `totalPriceMinor` and `amountMinor` as integers (cents) with `currency: 'ARS' | 'USD'`. All arithmetic (balance, overpay check, amount in words) operates on integers. Formatting to `$ 150.000,00` / `US$ 1.250,50` uses `Intl.NumberFormat('es-AR')` only at the edge.
- *Alternative:* decimal numbers. Rejected because float sums drift (`0.1 + 0.2`) and the balance must be exact.
- *Alternative:* a decimal library. Rejected as unnecessary, since integers cover the full range (max safe integer ≈ 9×10^13 pesos).

### D2. Payments as a subcollection of the work order, counter as a dedicated document
- Payments: `<workOrdersCollection>/{workOrderId}/payments/{paymentId}`.
- Receipt counter: `<orgScope>/counters/receipts` with `{ next: number }`. In `organization` mode this is `organizations/{orgId}/counters/receipts`. In `global` mode it is `counters/receipts`, the same collection-resolution pattern the existing repositories use.
- Recording a payment runs **one Firestore transaction** that reads the work order, its active payments, the organization profile, the client and the counter, validates the preconditions, increments the counter, and writes the payment. The transaction makes numbering race-free and keeps the overpay check consistent with concurrent payments.
- *Alternative:* `FieldValue.increment` outside a transaction. Rejected because it can't be combined atomically with the balance check, and a failed write after the increment leaves a gap.
- *Alternative:* top-level `payments` collection with `workOrderId`. Rejected because it needs extra indexes and the subcollection matches the per-job access pattern.

### D3. Balance is computed, not stored
The balance is derived from the work order total and its active payments (`computeBalance` in `packages/shared`), both when reading and inside the transaction. Payment counts per job are small, so reading them is cheap, and a derived value can't drift.
- *Alternative:* a denormalized `paidMinor` on the work order. Deferred. It can be added later inside the same transaction if list views ever need the balance without reading payments.

### D4. Work-order update guard reads payments in a transaction
`WorkOrderService.update` switches the price/currency path to a transaction that reads the active payments and enforces the currency lock and the minimum total. Updates that don't touch pricing keep the current path.

### D5. Issuance-time snapshots and the concept fixed on the payment
Each payment stores `issuer { businessName, cuit, address, phone }`, `client { name, taxId? }`, `workOrderTitle`, and `concept: 'advance' | 'balance-settlement'`, computed inside the transaction from the remaining balance after the payment. The receipt renders only from the payment document.
- *Alternative:* render from live data. Rejected because a reprinted receipt would silently change.

### D6. Organization profile stored on the organization document
Profile fields live under `profile` on `organizations/{orgId}` (or a single `settings/organization` document in `global` mode, through the same resolver). This avoids a new collection and keeps one read per payment. `GET /organization/profile` returns `{ configured: false }` when the profile is absent.

### D7. Admin authorization via a role decorator and guard
Add a `@RequireRole(OrganizationMemberRole.ADMIN)` decorator and a `RolesGuard` that reads `request.user.role` set by `OrganizationAuthGuard`, returning 403 otherwise. It applies to `PUT /organization/profile`, `POST /work-orders/:id/payments` and `POST /work-orders/:id/payments/:paymentId/void`. Read routes stay open to every active member. The web hides admin actions based on the role returned by the existing session/membership context. That is a UX choice, not the enforcement.

### D8. Pure shared helpers, tested in isolation
Add the following to `packages/shared`:
- `isValidCuit(digits)` (mod-11 with weights `5,4,3,2,7,6,5,4,3,2`)
- `normalizeTaxId`
- `formatReceiptNumber(n)` → `0001-%08d`
- `amountToSpanishWords(minor, currency)`
- `computeBalance(totalMinor, payments)`

They're used by both the API (validation, snapshots) and the web (display). Amount-to-words handles `un`/`uno` apocope ("un millón", "veintiún mil", final "uno"), `cien` vs `ciento`, `quinientos`/`setecientos`/`novecientos`, `veinti-` contractions, and `millón`/`millones`.

### D9. Receipt view reuses the print pattern
A dedicated `PaymentReceipt` React component renders the Spanish receipt with fixed Spanish strings (not routed through i18n). It's opened from the payments panel in a print-focused view that applies the existing print-hide classes to everything else.

### API surface
| Method | Path | Role |
|---|---|---|
| GET | `/organization/profile` | member |
| PUT | `/organization/profile` | admin |
| GET | `/work-orders/:id/payments` → `{ items, balance }` | member |
| POST | `/work-orders/:id/payments` | admin |
| POST | `/work-orders/:id/payments/:paymentId/void` `{ reason }` | admin |

Errors use the existing `ApiErrorResponse` (`fieldErrors` for validation, `ConflictError` → 409 for currency lock, cancelled job and double void).

## Risks / Trade-offs

- [Transaction contention on the single counter document when many payments are recorded concurrently] → Firestore sustains about one write per second per document, far above this domain's volume. A sharded counter can replace it later if needed.
- [Amount-to-words bugs on edge numbers] → Table-driven tests covering 0, 1, 15, 16, 21, 100, 101, 500, 1.000, 1.001, 21.000, 100.000, 1.000.000, 1.000.001, 2.000.000, 21.000.000, and cents.
- [Admin-only recording slows teams where non-admins collect money] → An explicit product choice. Widening it later is a guard change.
- [`global` vs `organization` repository mode doubles the path logic] → Reuse the existing resolver pattern and cover both modes in repository tests, as the current repositories do.
- [Member UI hides admin actions only cosmetically] → The API guard enforces it, and the spec scenarios test 403s.

## Migration Plan

- No data migration. All new work-order and client fields are optional, and existing documents read as unpriced or without a tax ID.
- Deploy order per slice: shared package, then API, then web. Each slice is backward compatible (the web tolerates absent fields, and the API accepts requests without new fields).
- Before recording the first payment, an admin must complete the organization profile. The payment endpoint enforces this and the panel links to Settings.
- Rollback: redeploy the previous API/web revisions. New Firestore documents (profile, payments, counter) are ignored by older code.

## Open Questions

- The exact visual layout of the receipt (logo placement, duplicate "original/copia" halves) can be refined during implementation without changing specs or tasks.
