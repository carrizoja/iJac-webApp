# Data backups and export

Objective: keep the data recoverable (Firestore backups + PITR) and give admins their own copy (Excel and JSON export). Branch: `feat/data-backups`. Delivery: ask-on-risk (forecast above 400 lines; ask before the PR). Test runners: bash test scripts (`scripts/`), jest (`apps/api`), vitest (`apps/web`).

## Specs

The full requirements and scenarios are in `openspec/changes/add-data-backups/specs/` (`data-export`, `database-backups`); the design is `openspec/changes/add-data-backups/design.md`.

- **S1 — Backups.** "Track A (infra) scripts/setup-backups.sh with --dry-run creating a daily Firestore backup schedule with 14-day retention plus enabling PITR, and a restore runbook in docs/deployment."
- **S2 — Excel export.** "GET /api/export.xlsx with sheets Clientes, Órdenes, Pagos (IDs plus readable columns such as client name and order number; voided payments marked)". Orders have no number, so payments show the order title (proposal).
- **S3 — JSON export.** "GET /api/export.json with the same data".
- **S4 — Admins only.** "Only admins." API refuses members (403); Settings shows "Exportar a Excel" and "Descargar copia (JSON)" only to admins.

## Tasks

- [x] T1 — S1 — inline — OpenSpec 1.1–1.2: setup script, its test (wired into CI), restore runbook. RED: 8 tests failed (script missing); GREEN: 8 passed. Shellcheck not installed locally; it runs in CI.
- [x] T2 — S2, S3 — inline — OpenSpec 2.1–2.3: `listAll` on the repositories, shared export type, `ExportService`. RED: 8 tests failed (`listAll` and the service missing); GREEN: 252 tests in the touched suites. `findByPaymentDate` now filters `listAll`; its existing tests still pass.
- [x] T3 — S2 — inline — OpenSpec 3.1–3.2: `exceljs` ^4.4.0, `buildWorkbook`. RED: module missing; GREEN: 11 export tests. Timestamps show Buenos Aires wall time; due and payment dates stay calendar dates.
- [ ] T4 — S2–S4 — inline — OpenSpec 4.1–4.2: endpoints and route docs.
- [ ] T5 — S4 — inline — OpenSpec 5.1–5.2: `apiDownload`, the Settings section.
- [ ] T6 — all — inline — OpenSpec 6.1: lint, typecheck, full suites.

Route evidence: T2–T5 depend on each other (the web uses the API contract, the endpoints use the service), so there is no parallel Writer trigger; work runs inline.

## Log

- L1 (2026-11-12, user): "I thought about how can I do a backup of the database of the webApp. One options is to export Orders and Clients in a .xlsx file. What do you think?"
- L2 (2026-11-12, user): "I am worried about the two of them. Could we add the two possibilities?"
- L3 (2026-11-12, user): "Only admins." / "Yes, go with both." (IDs plus readable columns) / "Yes, include Json."
- L4 (2026-11-12): T1 done. The CI job keeps its name "Deploy script" so a required status check doesn't break; it now also runs the backup script test.
