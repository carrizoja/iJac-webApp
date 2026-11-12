import type { Client, Payment, WorkOrder } from './domain.js';

/** Bumped whenever the shape of `DataExport` changes in a way a reader must know about. */
export const DATA_EXPORT_FORMAT_VERSION = 1;

/**
 * A full copy of one organization's records, as served by `GET /api/export.json`
 * and rendered into the Excel export. Records keep their stored fields; amounts
 * stay in minor currency units.
 */
export interface DataExport {
  formatVersion: typeof DATA_EXPORT_FORMAT_VERSION;
  /** ISO timestamp of when the export was taken. */
  exportedAt: string;
  organizationId: string;
  clients: Client[];
  workOrders: WorkOrder[];
  payments: Payment[];
}
