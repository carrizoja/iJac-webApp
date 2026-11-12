# Design

## Context

See proposal.md (Why). The current state that shapes the approach:

- Data lives in Firestore under `organizations/{org}/clients`, `workOrders` and `payments`. The API (NestJS on Cloud Run) reaches it through repository interfaces (`ClientRepository`, `WorkOrderRepository`, `PaymentRepository`), each scoped by `organizationId`.
- The repositories only list by page (`findMany` with `cursor`/`limit`) or by key (`findByWorkOrder`, `findByPaymentDate`). Nothing lists a whole collection.
- Roles already exist: `OrganizationAuthGuard` sets the member role, and `RolesGuard` with `@RequireRole(OrganizationMemberRole.ADMIN)` enforces it (see `organization-profile.controller.ts`).
- Each payment stores snapshots taken when it was issued: `workOrderTitle`, `client.name`, `issuer`. Receipts print from them.
- The web reads the role with `getCurrentMember()` (`GET /me`). `lib/api.ts` only has JSON helpers, which add the bearer token.
- `scripts/deploy.sh` sets the conventions for operational scripts: `set -Eeuo pipefail`, `--dry-run`, `--yes`, `--help`, and a `run()` wrapper.

## Goals / Non-Goals

**Goals:**
- One query path feeds both formats, so the Excel and JSON exports can't drift apart.
- Backups and PITR are configured by a script checked into the repo, not by clicking through the console.

**Non-Goals:**
- Importing an export back into the app. The JSON format is designed so this is possible later, but there is no import endpoint.
- Scheduled or emailed exports, or exporting members, settings, branding or calendar data.
- Streaming exports. At this data size the workbook is built in memory.
- Copying backups outside Google Cloud automatically. The JSON download covers the "a copy in your own hands" need.

## Decisions

### D1. One `ExportService` builds a snapshot, and two renderers format it
`ExportService.collect(organizationId)` returns `{ clients, workOrders, payments }`. The JSON controller serializes it with a `formatVersion: 1` header. A pure `buildWorkbook(snapshot, exportedAt)` function turns it into an `exceljs` workbook.
- *Why:* the spec requires both formats to hold the same records, and a shared snapshot guarantees that by construction. A pure builder can be unit-tested without Firestore.
- *Alternative:* two endpoints that each query separately. Rejected, because they would duplicate the joins and could drift.

### D2. New `listAll(organizationId)` methods on the three repositories
Add `listAll` to each repository interface and its Firestore implementation. It reads the whole collection under `organizations/{org}`. The in-memory test doubles implement it too.
- *Why:* the scoping by organization stays in the repository, where every other query already does it, and the export never builds Firestore paths itself.
- *Alternative:* loop over `findMany` pages. Rejected, because it is tied to page limits and search behavior that exist for the UI.

### D3. Readable columns come from lookups, with snapshots as a fallback
Orders get the client name by looking up `clientId` in a map built from the exported clients. Payments use their own `workOrderTitle` and `client.name` snapshots, which is what the receipt shows. A missing client leaves the readable cell empty and keeps the ID.
- *Why:* the snapshots are the payment's legal record, and lookups for orders avoid one query per row.

### D4. Excel cell types and labels
Amounts are written as `amountMinor / 100` numbers with a `0.00` number format, plus a "Moneda" column. Dates (`YYYY-MM-DD`) and timestamps (ISO strings) are written as Date cells. Status, priority and payment method use the same Spanish labels as the UI, taken from the shared label maps where they exist, or from a small map in the builder otherwise. The header row is bold and frozen.
- *Why:* the spec requires typed cells, and labels that match the UI avoid confusion.

### D5. `exceljs` over SheetJS
- *Why:* `exceljs` is MIT-licensed on npm, writes typed cells, number formats and frozen panes, and works in Node. The npm build of SheetJS is old; current versions are published only from its own CDN.

### D6. Web downloads with a blob
Add `apiDownload(path, token)` to `lib/api.ts`. It returns `{ blob, filename }`, reading the file name from `Content-Disposition`. A new `DataExportSettings` component asks `getCurrentMember()` for the role, renders nothing for members, and saves the file through a temporary object-URL `<a download>`. Its section on the Settings page is rendered by the component itself, so members see no empty section.
- *Why:* a plain link can't send the bearer token, and the token isn't a cookie.

### D7. `setup-backups.sh` follows `deploy.sh`
The script uses the same flag set and `run()` wrapper. It checks first with `gcloud firestore backups schedules list` and skips creating the schedule when a daily one already exists. It turns on PITR with `gcloud firestore databases update --enable-pitr`.
- *Why:* rerunning it is safe (spec), and operators already know these conventions.

## Risks / Trade-offs

- [The export is a full read of three collections, so it costs Firestore reads and memory] → The data is small. Only admins can export, and the button is disabled while a download runs.
- [The export holds personal data (names, phones, tax IDs)] → Admins only, organization-scoped through the repository, served with `Cache-Control: no-store`. The help text tells the admin to keep the file safe.
- [`exceljs` adds a dependency to the API image (risk item 5)] → It is a single runtime dependency, pinned by the lockfile, and the API image build in CI catches problems.
- [PITR and backups add storage cost] → Retention is bounded at 7 days for PITR and 14 for backups. The runbook names the cost.
- [A restore can overwrite good data] → The runbook restores into a new database and copies back selectively, never over `(default)`.

## Migration Plan

1. Merge the code, then deploy the full stack (API + web), because the web buttons call the new API routes.
2. Run `scripts/setup-backups.sh --dry-run`, then `scripts/setup-backups.sh`, once against `ijac-webapp`.
3. Check with the `gcloud` describe and list commands from the spec, and do one practice restore into a scratch database following the runbook.

Rollback: the export endpoints can be reverted by redeploying. The backup schedule can be removed with `gcloud firestore backups schedules delete`, and PITR turned off with `--no-enable-pitr`. None of these touch stored data.
