## Why

Clients regularly pay part of a job up front and ask for a receipt as proof. The app has no concept of money today: work orders carry no price, payments are tracked outside the system, and receipts are written by hand. Recording payments against a job, with a running balance and a printable non-fiscal receipt, removes that manual work and gives the organization one trustworthy payment history per job.

## What Changes

- Add an **organization profile** (business name, CUIT, address, phone) that admins edit in a new Settings screen. Its data is printed as the receipt issuer.
- Add **job pricing** to work orders: an optional total price stored in minor units (cents) with a single currency per job (`ARS` or `USD`). The currency locks once the job has an active payment, and the total cannot drop below the amount already paid.
- Add **payments** recorded against a work order: amount, payment date, method (cash, bank transfer, Mercado Pago, check, other) and optional notes. Each payment receives an organization-wide sequential receipt number formatted `0001-00000042`. Payments are never edited or deleted. They can only be voided with a mandatory reason and an audit trail. Voided payments keep their number and remain visible.
- Show a **balance** per work order: total price minus the sum of active payments. A payment that would exceed the remaining balance is rejected, and no new payments are accepted on cancelled work orders.
- Restrict recording and voiding payments to organization **admins**. Members can view payments and balances and reprint receipts.
- Add a **printable receipt**, always in Spanish. It shows the issuer and client data as captured at issuance, the amount in figures and in words, a concept ("anticipo" while a balance remains, "cancelación de saldo" when the payment settles the job), and the label "Documento no válido como factura". It uses the existing browser print / "Save as PDF" flow.
- Add an optional **tax identifier** (CUIT/DNI) to clients. It appears on receipts only when present.

## Capabilities

### New Capabilities
- `organization-profile`: Admin-managed issuer data (business name, CUIT, address, phone) for an organization, with CUIT validation and role-restricted editing.
- `work-order-payments`: Payments recorded against a work order: sequential receipt numbering, voiding with audit, balance computation, overpayment and cancelled-order rules, admin-only mutation, and issuance-time data snapshots.
- `payment-receipts`: Printable non-fiscal Spanish receipt for a payment, including the amount in words, the concept rule, voided marking and the reprint behavior.

### Modified Capabilities
- `work-order-management`: The work-order record gains an optional total price and currency. Updates enforce the currency lock and the minimum total once payments exist.
- `client-management`: The client record gains an optional tax identifier (CUIT/DNI).

## Impact

- **Shared domain** (`packages/shared`): new types for the organization profile, payments, currency and payment method. New `WorkOrder` and `Client` fields. Pure helpers for the amount in words, CUIT validation, receipt-number formatting and balance computation.
- **API** (`apps/api`): new organization-profile and payment endpoints, an admin-role guard, a Firestore counter document for receipt numbers, validation changes in work-order and client DTOs and repositories.
- **Firestore**: new org-scoped documents (organization profile fields, `workOrders/{id}/payments`, receipt counter). Direct browser access stays denied by the existing default-deny rules, so no rule loosening is needed. Existing work orders and clients need no migration because all new fields are optional.
- **Web** (`apps/web`): Settings page, price/currency inputs on the work-order form, a payments panel with balance in work-order details, a receipt print view, a tax ID input on the client form, and new ES/EN translations (the receipt itself is Spanish only).
- **Delivery**: planned as four review slices: organization profile, client tax ID, job pricing, then payments and receipts.
