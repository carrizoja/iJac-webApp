# Hoy "Cobrado hoy"

Objective: show on Hoy what was collected today, per currency, with the payments behind it. Branch: `feat/web-collected-today`. Delivery: single PR with work-unit commits (API + web; needs a full deploy, not `--web-only`). Test runners: jest (`apps/api`), vitest (`apps/web`).

## Specs

- **S1 — Which payments.** User choice: "Payment date (Recommended)": "Counts payments whose receipt date is today. It matches the receipts and cash in hand; a payment recorded today but dated yesterday shows yesterday." Voided payments are not counted.
- **S2 — API.** A read-only endpoint lists one organization's payments for a given `YYYY-MM-DD` payment date, with a total per currency. Scoped to the caller's organization; open to every member, like the per-order payment list. No new index, no change to stored data.
- **S3 — Hoy block.** A "Cobrado hoy" block shows the total per currency (never mixed) and each payment: receipt number, client, order, amount, method. Each payment links to its order's payments. Empty and error states say so plainly.
- **S4 — Stays current.** A payment recorded from Hoy and dated today appears in the block without a reload.

## Tasks

- [ ] T1 — S1, S2 — inline — API `GET /payments?date=YYYY-MM-DD` (shared response type, repository, service, controller, DTO).
- [ ] T2 — S1, S3, S4 — inline — Hoy "Cobrado hoy" block and `listPaymentsByDate` resource.

Route evidence: T2 depends on T1, and both are under the parallel threshold, so no Writer trigger; work runs inline. Risk: T1 names item 2 (an organization-scoped read of payments: a mistake could expose another organization's payments).

## Log

- L1 (2026-11-11, user): "Go with your suggestion" (the suggestion: "Cobrado hoy" on Hoy, showing what came in today).
- L2 (2026-11-11, user): "Payment date (Recommended)".
- L3: Payments live in `workOrders/{id}/payments` under each organization's scope (or the root in global mode). `findMany` already reads each order's payments for balances, so T1 reads them the same way and filters by `paymentDate`: no collection-group query, no index. A new `payments` controller avoids the `work-orders/:id` route.
