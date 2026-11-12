# Data backups and export

Objective: keep the data recoverable (Firestore backups + PITR) and give admins their own copy (Excel and JSON export). Branch: `feat/data-backups`. Delivery: single PR with work-unit commits (user choice, L8). Test runners: bash test scripts (`scripts/`), jest (`apps/api`), vitest (`apps/web`).

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
- [x] T4 — S2–S4 — inline — OpenSpec 4.1–4.2: endpoints and route docs. RED: controller and file-name helper missing; GREEN: 21 export tests over HTTP (admin 200, member 403, no token 401 with the real FirebaseAuthGuard, org scoping, same records), full API suite 390, AppModule DI resolves. Risk: item 2 (admin-only guard), own commit.
- [x] T5 — S4 — inline — OpenSpec 5.1–5.2: `apiDownload`, `downloadDataExport`, the Settings section. RED: 5 api tests (function missing) and the component (module missing) failed; GREEN: 671 web tests, lint, typecheck, build.
- [x] T6 — all — inline — OpenSpec 6.1: lint, typecheck, full suites. API 390, web 671, shared 78, setup-backups 8, deploy 13; lint and typecheck clean everywhere. OpenSpec 6.2 (manual check after deploy) stays open.

Route evidence: T2–T5 depend on each other (the web uses the API contract, the endpoints use the service), so there is no parallel Writer trigger; work runs inline.

## Log

- L1 (2026-11-12, user): "I thought about how can I do a backup of the database of the webApp. One options is to export Orders and Clients in a .xlsx file. What do you think?"
- L2 (2026-11-12, user): "I am worried about the two of them. Could we add the two possibilities?"
- L3 (2026-11-12, user): "Only admins." / "Yes, go with both." (IDs plus readable columns) / "Yes, include Json."
- L4 (2026-11-12): T1 done. The CI job keeps its name "Deploy script" so a required status check doesn't break; it now also runs the backup script test.
- L5 (2026-11-12): Commits: T1 4e48b45, T2 c605aba, T3 9b8d2b7, T4 b35b9bb (risk item 2, own commit), T5 2051b97. Native assess on the branch: risk high (`review_due: high_risk`; reasons: executable script, payments hot path, shell in CI, escalated item 2). Independent verifier launched for items 2 and 5 before the native review. The branch is ~1,000 authored lines plus the lockfile, above the 400-line budget, so ask-on-risk applies: ask for the chain strategy before opening a PR.
- L6 (2026-11-12): Independent verifier: no blockers; every spec requirement and S1–S4 PASS (the two live Google Cloud checks can't be verified here); `findByPaymentDate` unchanged (the baseline spec passes on the branch). One correction batch for its advisories: the setup script now stops when it can't list schedules or read the PITR state, no longer needs gcloud for `--dry-run`, and prints commands that can be pasted into bash. RED: 5 new tests failed; GREEN: 12 passed.
- L7 (2026-11-12): The user chose "Review this change". Native review (risk, resilience, reliability) of c3797cd..d7a86cc: approved, acknowledged, authority burned. No blockers. Advisories, as later work: revoke the object URL after a delay instead of right after `click()` (both lenses); the export's per-order fan-out grows with organization size (accepted in the design); payments under a deleted work order would be missed, but deleting an order that has payments is refused (WORK_ORDER_HAS_PAYMENTS).
- L8 (2026-11-12, user): "Single PR (Recommended)". Delivery: single-pr (exception-ok) with the work-unit commits.
