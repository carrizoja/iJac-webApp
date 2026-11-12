import { Workbook, Worksheet } from 'exceljs';
import {
  Client,
  DataExport,
  Payment,
  PaymentConcept,
  PaymentMethod,
  PaymentStatus,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@ijac/shared';

/** Timestamps are shown as wall-clock time where the business operates. */
const DISPLAY_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const AMOUNT_FORMAT = '#,##0.00';
const DATE_FORMAT = 'yyyy-mm-dd';
const DATE_TIME_FORMAT = 'yyyy-mm-dd hh:mm';

// Same wording as the web UI (apps/web/src/i18n/translations.ts and the receipt).
const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.OPEN]: 'Abierta',
  [WorkOrderStatus.IN_PROGRESS]: 'En progreso',
  [WorkOrderStatus.COMPLETED]: 'Completada',
  [WorkOrderStatus.CANCELLED]: 'Cancelada',
};

const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  [WorkOrderPriority.LOW]: 'Baja',
  [WorkOrderPriority.NORMAL]: 'Normal',
  [WorkOrderPriority.HIGH]: 'Alta',
  [WorkOrderPriority.URGENT]: 'Urgente',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.ACTIVE]: 'Activo',
  [PaymentStatus.VOIDED]: 'Anulado',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.BANK_TRANSFER]: 'Transferencia bancaria',
  [PaymentMethod.MERCADO_PAGO]: 'Mercado Pago',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.OTHER]: 'Otro',
};

const PAYMENT_CONCEPT_LABELS: Record<PaymentConcept, string> = {
  [PaymentConcept.ADVANCE]: 'Anticipo',
  [PaymentConcept.BALANCE_SETTLEMENT]: 'Cancelación de saldo',
};

type CellValue = string | number | Date | null;

interface Column<T> {
  header: string;
  width: number;
  numFmt?: string;
  value: (record: T) => CellValue;
}

/** A calendar date (`YYYY-MM-DD…`) as a date cell, without any time zone shift. */
function calendarDate(value: string | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

const wallClock = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * An ISO timestamp as a date cell showing Buenos Aires wall-clock time. Spreadsheet
 * dates carry no time zone, and exceljs writes a Date's UTC fields, so the wall-clock
 * fields are stored as UTC.
 */
function timestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    wallClock.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
}

function amount(minor: number | undefined): number | null {
  return minor === undefined ? null : minor / 100;
}

function text(value: string | undefined | null): string | null {
  return value ? value : null;
}

function addSheet<T>(workbook: Workbook, name: string, columns: Column<T>[], records: T[]) {
  const sheet: Worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
    ...(column.numFmt && { style: { numFmt: column.numFmt } }),
  }));
  sheet.getRow(1).font = { bold: true };
  for (const record of records) {
    sheet.addRow(columns.map((column) => column.value(record)));
  }
}

const clientColumns: Column<Client>[] = [
  { header: 'ID', width: 24, value: (c) => c.id },
  { header: 'Nombre', width: 28, value: (c) => c.name },
  { header: 'Email', width: 28, value: (c) => text(c.email) },
  { header: 'Teléfono', width: 16, value: (c) => text(c.phone) },
  { header: 'Empresa', width: 20, value: (c) => text(c.organization) },
  { header: 'CUIT/DNI', width: 14, value: (c) => text(c.taxId) },
  { header: 'Notas', width: 32, value: (c) => text(c.notes) },
  { header: 'Órdenes', width: 10, value: (c) => c.workOrderCount },
  { header: 'Creado', width: 17, numFmt: DATE_TIME_FORMAT, value: (c) => timestamp(c.createdAt) },
  {
    header: 'Actualizado',
    width: 17,
    numFmt: DATE_TIME_FORMAT,
    value: (c) => timestamp(c.updatedAt),
  },
];

function workOrderColumns(clientNames: Map<string, string>): Column<WorkOrder>[] {
  return [
    { header: 'ID', width: 24, value: (o) => o.id },
    { header: 'Título', width: 32, value: (o) => o.title },
    { header: 'Cliente ID', width: 24, value: (o) => o.clientId },
    { header: 'Cliente', width: 28, value: (o) => clientNames.get(o.clientId) ?? null },
    { header: 'Estado', width: 14, value: (o) => WORK_ORDER_STATUS_LABELS[o.status] ?? o.status },
    {
      header: 'Prioridad',
      width: 12,
      value: (o) => WORK_ORDER_PRIORITY_LABELS[o.priority] ?? o.priority,
    },
    {
      header: 'Vencimiento',
      width: 13,
      numFmt: DATE_FORMAT,
      value: (o) => calendarDate(o.dueDate),
    },
    { header: 'Total', width: 14, numFmt: AMOUNT_FORMAT, value: (o) => amount(o.totalPriceMinor) },
    { header: 'Moneda', width: 9, value: (o) => text(o.currency) },
    { header: 'Descripción', width: 40, value: (o) => text(o.description) },
    { header: 'Creada', width: 17, numFmt: DATE_TIME_FORMAT, value: (o) => timestamp(o.createdAt) },
    {
      header: 'Actualizada',
      width: 17,
      numFmt: DATE_TIME_FORMAT,
      value: (o) => timestamp(o.updatedAt),
    },
  ];
}

const paymentColumns: Column<Payment>[] = [
  { header: 'ID', width: 24, value: (p) => p.id },
  { header: 'Recibo', width: 10, value: (p) => p.receiptNumber },
  { header: 'Fecha', width: 12, numFmt: DATE_FORMAT, value: (p) => calendarDate(p.paymentDate) },
  { header: 'Estado', width: 10, value: (p) => PAYMENT_STATUS_LABELS[p.status] ?? p.status },
  { header: 'Monto', width: 14, numFmt: AMOUNT_FORMAT, value: (p) => amount(p.amountMinor) },
  { header: 'Moneda', width: 9, value: (p) => p.currency },
  { header: 'Medio', width: 22, value: (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
  { header: 'Concepto', width: 20, value: (p) => PAYMENT_CONCEPT_LABELS[p.concept] ?? p.concept },
  { header: 'Orden ID', width: 24, value: (p) => p.workOrderId },
  // Snapshots taken when the receipt was issued: what the receipt itself shows.
  { header: 'Orden', width: 32, value: (p) => text(p.workOrderTitle) },
  { header: 'Cliente', width: 28, value: (p) => text(p.client?.name) },
  { header: 'CUIT/DNI cliente', width: 16, value: (p) => text(p.client?.taxId) },
  { header: 'Notas', width: 32, value: (p) => text(p.notes) },
  {
    header: 'Registrado por',
    width: 24,
    value: (p) => text(p.recordedBy?.displayName) ?? text(p.recordedBy?.email),
  },
  {
    header: 'Registrado el',
    width: 17,
    numFmt: DATE_TIME_FORMAT,
    value: (p) => timestamp(p.createdAt),
  },
  {
    header: 'Anulado el',
    width: 17,
    numFmt: DATE_TIME_FORMAT,
    value: (p) => timestamp(p.void?.voidedAt),
  },
  { header: 'Motivo de anulación', width: 32, value: (p) => text(p.void?.reason) },
];

/**
 * Renders an export snapshot as a workbook with the sheets Clientes, Órdenes and
 * Pagos. Each row keeps its IDs and adds readable references next to them.
 */
export function buildWorkbook(data: DataExport): Workbook {
  const workbook = new Workbook();
  workbook.creator = 'iJac';
  workbook.created = new Date(data.exportedAt);

  const clientNames = new Map(data.clients.map((client) => [client.id, client.name]));
  addSheet(workbook, 'Clientes', clientColumns, data.clients);
  addSheet(workbook, 'Órdenes', workOrderColumns(clientNames), data.workOrders);
  addSheet(workbook, 'Pagos', paymentColumns, data.payments);
  return workbook;
}
