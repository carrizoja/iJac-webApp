# Tasks

## 1. Database backups (infra)

- [x] 1.1 Write `scripts/setup-backups.sh` following `deploy.sh` (`--dry-run`, `--yes`, `--help`, `run()` wrapper): create the daily backup schedule with 14-day retention only if no daily schedule exists, and enable PITR. Verify: `--dry-run` prints the commands and exits 0, an unknown option prints the usage and exits non-zero, and `bash -n` and `shellcheck` pass
- [x] 1.2 Write `docs/deployment/database-backups.md`: running the setup script, checking it with `schedules list` and `databases describe`, listing backups, restoring into a new database, exporting at a point in time with `--snapshot-time`, copying back selectively, the warning against overwriting `(default)`, the cost note, and rollback. Verify: every command in the runbook matches the script and the spec

## 2. Export data path (API)

- [ ] 2.1 Add `listAll(organizationId)` to `ClientRepository`, `WorkOrderRepository` and `PaymentRepository`, their Firestore implementations and their test doubles. Verify: repository specs show it returns every record of one organization and none of another
- [ ] 2.2 Add the export JSON shape to `@ijac/shared` (`formatVersion`, `exportedAt`, `organizationId`, `clients`, `workOrders`, `payments`). Verify: shared typecheck passes
- [ ] 2.3 Create `ExportService.collect(organizationId)` in a new export module. Verify: a unit test with in-memory repositories returns the three collections for the organization, and empty arrays for an empty one

## 3. Excel workbook (API)

- [ ] 3.1 Add `exceljs` to `apps/api` and run the install. Verify: the lockfile updates and the API builds
- [ ] 3.2 Write a pure `buildWorkbook(snapshot, exportedAt)` with the sheets "Clientes", "Órdenes" and "Pagos": a bold frozen header row, ID plus readable columns (order → client name from the lookup, payment → order ID and title plus client name from the snapshots), numeric amounts with a "Moneda" column, Date cells, Spanish labels, and voided payments with status "Anulado", void date and reason. Verify: unit tests read the workbook back and check sheet order, headers, the `c1`/"Ana Pérez" and `o1`/"Reparación techo" rows, the missing-client row, the 150050 → 1500.50 amount, and the voided receipt 12

## 4. Export endpoints (API)

- [ ] 4.1 Add `GET /api/export.xlsx` and `GET /api/export.json` with `@RequireRole(OrganizationMemberRole.ADMIN)`, attachment `Content-Disposition` named `ijac-export-<YYYY-MM-DD>.xlsx|.json`, the right content types, and `Cache-Control: no-store`. Verify: controller and e2e tests cover admin 200, member 403, no token 401, org-A-only content, and the same records in both formats
- [ ] 4.2 Document both endpoints in `docs/deployment/cloud-run-api-v1.md`, next to the other routes. Verify: the doc lists the routes, the role, and the response formats

## 5. Settings section (web)

- [ ] 5.1 Add `apiDownload(path, token)` to `lib/api.ts`, returning `{ blob, filename }` from `Content-Disposition`. Verify: `api.test.ts` covers the bearer header, the file name, and a failed response
- [ ] 5.2 Create the `DataExportSettings` component: it renders the "Respaldo de datos" section with "Exportar a Excel" and "Descargar copia (JSON)" only when `getCurrentMember()` returns `admin`, disables the buttons while a download runs, shows an error message if it fails, and includes help text about keeping the file safe. Add it to `pages/settings/index.astro` and add the i18n strings. Verify: component tests cover the admin view, the member view (nothing rendered), the in-progress state, and the error with retry

## 6. Integration

- [ ] 6.1 Run lint, typecheck and the full test suites for `apps/api`, `apps/web` and `packages/shared`. Verify: all pass
- [ ] 6.2 After the full deploy, download both files as an admin and open the .xlsx in a spreadsheet; open Settings as a member. Verify: the files open with the right sheets and records, and the member sees no export section

## Workflow follow-up

- Run `scripts/setup-backups.sh --dry-run`, then `scripts/setup-backups.sh` against `ijac-webapp`, and do one practice restore following the runbook (the operator runs this; it changes production infrastructure).
- Archive the change with `/opsx:archive` once it is deployed.
