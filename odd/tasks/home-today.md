# Home "Hoy" view

Objective: replace the empty home page with a "Hoy" view of what needs attention. Branch: `feat/web-home-today`. Delivery: single PR with work-unit commits (API + web; needs a full deploy). Test runners: jest (`apps/api`), vitest (`apps/web`).

## Specs

- **S1 — Atención.** The main block lists orders past their due date first, marked as overdue ("Vencida"), then orders due today and this week. Completed and cancelled orders are excluded. Each row shows title, client, due date, status and priority, and links to the order.
- **S2 — Cobros pendientes.** Orders with money still owed, largest balance first. On top, the total owed, kept separate per currency (ARS and USD never added together). Each row links to the order's payments.
- **S3 — Balances from the API.** User choice: "API total (Recommended)": "Add the paid and remaining amounts to the work-order list the API already returns, computed from active payments." Optional `paidMinor` and `remainingMinor` on list summaries of priced orders only.
- **S4 — Agenda de hoy.** Today's Google Calendar events. If the calendar is not connected, a short line linking to Calendario to connect it.
- **S5 — Trabajo abierto.** Counts of open and in-progress orders; each count opens the Órdenes list already filtered (the list reads the filter from the link).
- **S6 — Layout and states.** Heading "Hoy" with today's date. Wide screen: Atención and Cobros in the main column, Agenda and Trabajo abierto in a narrower side column; phone: stacked in the same order. Each block loads and fails on its own; empty blocks say so plainly (e.g. "No hay órdenes vencidas"). Every number links to the records behind it.
- **S7 — Out of scope.** No charts, no big headline numbers, no change to the visual style (confirmed "Keep current style").

## Tasks

- [x] T1 — S3 — inline — API list summaries carry `paidMinor`/`remainingMinor` for priced orders. RED: new repository test failed (no paidMinor); GREEN: 349 API tests pass.
- [x] T2 — S5 — inline — Órdenes list reads `status`/`priority` filters from the URL. RED: URL test failed; GREEN: 56 work-order tests pass. T1 commit 12e2608 (review approved).
- [x] T3 — S1, S2, S4, S5, S6, S7 — inline — Hoy view on `/`. RED: new summary and dashboard tests failed (module missing); GREEN: 404 web tests, typecheck, lint, build, design detector clean. T2 commit e180609 (review approved).

Route evidence: no Writer trigger (units depend on each other and are under the parallel threshold); work runs inline.

## Log

- L1 (2026-11-06, user): "Let's do the home "Hoy" view"
- L2 (2026-11-06): Interview answers: users "Mostly me"; Hoy content "Overdue and due soon, Who owes money, Today's calendar, Open work by status"; device "Desktop". Brief confirmed "Yes, build it"; balances "API total (Recommended)". PRODUCT.md written at `apps/web/PRODUCT.md`.
- L3: Plan for S3: compute balances in `FirestoreWorkOrderRepository.findMany` by reading each priced order's `payments` subcollection in parallel and applying shared `computeBalance`.
- L4 (decision): Orders due today appear only in "Agenda de hoy"; "Atención" shows overdue orders and the next 7 days (from tomorrow), so no order is listed twice. The agenda is built from work-order due dates, which is what the Calendar view and Google Calendar sync show, plus a link to connect or open Calendario.
- L5: Not checked in a browser: the home page is behind login. Payments panel gets `id="payments"` so "Cobros pendientes" links land on it.
