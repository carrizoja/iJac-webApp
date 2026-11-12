# Proposal

## Why

Two risks have no protection today. A mistake or outage could lose the organization's data: a bad deploy, a buggy migration, or a wrong delete. And the organization has no copy of its own data outside Google Cloud. The only backup is a manual `gcloud firestore export` step written into one cutover runbook.

## What Changes

- **Automatic database backups (infra).** A new `scripts/setup-backups.sh` sets up a daily Firestore backup schedule kept for 14 days and turns on point-in-time recovery (PITR) for the last 7 days. Like `deploy.sh`, it supports `--dry-run` and asks for confirmation. A new runbook in `docs/deployment/` explains how to restore from a scheduled backup and from PITR.
- **Excel export (app, admins only).** `GET /api/export.xlsx` returns a workbook with three sheets: Clientes, Órdenes and Pagos. Each row keeps its IDs and adds readable columns: the client name on each order, and the order title and client name on each payment. Voided payments are included and marked as voided.
- **JSON copy (app, admins only).** `GET /api/export.json` returns the same data as JSON, so it can be read by a machine or re-imported.
- **Settings.** For admins only, the Settings page shows a "Respaldo de datos" section with two buttons: "Exportar a Excel" and "Descargar copia (JSON)". Members don't see the section, and the API refuses their requests.
- A new API dependency: `exceljs`.

## Capabilities

### New Capabilities

- `data-export`: admin-only export of the organization's clients, work orders and payments, as an Excel workbook or a JSON file, started from Settings.
- `database-backups`: the automatic Firestore backup schedule, point-in-time recovery, the setup script that configures them, and the restore runbook.

### Modified Capabilities

(none)

## Impact

- **API:** a new export module (controller, service, workbook builder) that reads the existing client, work-order and payment repositories, scoped to the organization and guarded by `@RequireRole(OrganizationMemberRole.ADMIN)`. It reads every record of the organization, so the repositories need methods that list everything.
- **Web:** a new settings component that shows its buttons only when `getCurrentMember()` returns `admin`, downloads with the bearer token, and saves the file. Adds i18n strings.
- **Shared:** a typed shape for the JSON export.
- **Dependencies:** `exceljs` in `apps/api`.
- **Infra:** Firestore backup schedule and PITR on project `ijac-webapp`. PITR and backup storage add a small storage cost.
- **Docs:** a new restore runbook in `docs/deployment/`.
