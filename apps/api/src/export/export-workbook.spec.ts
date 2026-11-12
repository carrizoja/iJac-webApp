import { Workbook, Worksheet } from 'exceljs';
import {
  Client,
  Currency,
  DATA_EXPORT_FORMAT_VERSION,
  DataExport,
  Payment,
  PaymentConcept,
  PaymentMethod,
  PaymentStatus,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@ijac/shared';
import { buildWorkbook } from './export-workbook';

const actor = { uid: 'u1', email: 'admin@x.test', displayName: 'Ada Admin' };

const client: Client = {
  id: 'c1',
  name: 'Ana Pérez',
  email: 'ana@x.test',
  phone: '555-0100',
  organization: 'Acme',
  notes: '',
  taxId: '20123456786',
  workOrderCount: 1,
  createdAt: '2026-08-01T13:00:00.000Z',
  updatedAt: '2026-08-02T13:00:00.000Z',
};

const workOrder: WorkOrder = {
  id: 'o1',
  title: 'Reparación techo',
  status: WorkOrderStatus.IN_PROGRESS,
  priority: WorkOrderPriority.HIGH,
  clientId: 'c1',
  dueDate: '2026-09-01T00:00:00.000Z',
  totalPriceMinor: 300000,
  currency: Currency.ARS,
  createdAt: '2026-08-03T13:00:00.000Z',
  updatedAt: '2026-08-03T13:00:00.000Z',
};

const orphanOrder: WorkOrder = {
  id: 'o2',
  title: 'Sin cliente',
  status: WorkOrderStatus.OPEN,
  priority: WorkOrderPriority.NORMAL,
  clientId: 'gone',
  createdAt: '2026-08-04T13:00:00.000Z',
  updatedAt: '2026-08-04T13:00:00.000Z',
};

const payment: Payment = {
  id: 'p1',
  workOrderId: 'o1',
  receiptNumber: 11,
  amountMinor: 150050,
  currency: Currency.ARS,
  paymentDate: '2026-08-10',
  method: PaymentMethod.BANK_TRANSFER,
  status: PaymentStatus.ACTIVE,
  concept: PaymentConcept.ADVANCE,
  issuer: { businessName: 'iJac SRL', cuit: '20123456786', address: 'Calle 1', phone: '555' },
  client: { name: 'Ana Pérez', taxId: '20123456786' },
  workOrderTitle: 'Reparación techo',
  recordedBy: actor,
  createdAt: '2026-08-10T15:00:00.000Z',
};

const voided: Payment = {
  ...payment,
  id: 'p2',
  receiptNumber: 12,
  amountMinor: 1000,
  status: PaymentStatus.VOIDED,
  void: { reason: 'Monto equivocado', voidedBy: actor, voidedAt: '2026-08-11T15:30:00.000Z' },
};

function snapshot(overrides: Partial<DataExport> = {}): DataExport {
  return {
    formatVersion: DATA_EXPORT_FORMAT_VERSION,
    exportedAt: '2026-11-12T15:30:00.000Z',
    organizationId: 'org-a',
    clients: [client],
    workOrders: [workOrder, orphanOrder],
    payments: [payment, voided],
    ...overrides,
  };
}

/** Writes the workbook to bytes and reads it back, as a spreadsheet app would. */
async function roundTrip(data: DataExport): Promise<Workbook> {
  const buffer = await buildWorkbook(data).xlsx.writeBuffer();
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as ArrayBuffer);
  return workbook;
}

function header(sheet: Worksheet): string[] {
  return (sheet.getRow(1).values as unknown[]).slice(1).map(String);
}

/** The row whose cell under `column` equals `value`, as a header → value map. */
function rowBy(sheet: Worksheet, column: string, value: unknown): Record<string, unknown> {
  const names = header(sheet);
  const index = names.indexOf(column) + 1;
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.getCell(index).value === value) {
      return Object.fromEntries(names.map((name, i) => [name, row.getCell(i + 1).value]));
    }
  }
  throw new Error(`no row with ${column} = ${String(value)}`);
}

describe('buildWorkbook', () => {
  it('has the sheets Clientes, Órdenes and Pagos in that order, with bold frozen headers', async () => {
    const workbook = await roundTrip(snapshot());

    expect(workbook.worksheets.map((s) => s.name)).toEqual(['Clientes', 'Órdenes', 'Pagos']);
    for (const sheet of workbook.worksheets) {
      expect(sheet.getRow(1).getCell(1).font?.bold).toBe(true);
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    }
    expect(header(workbook.getWorksheet('Clientes')!)).toEqual([
      'ID',
      'Nombre',
      'Email',
      'Teléfono',
      'Empresa',
      'CUIT/DNI',
      'Notas',
      'Órdenes',
      'Creado',
      'Actualizado',
    ]);
    expect(header(workbook.getWorksheet('Órdenes')!)).toEqual([
      'ID',
      'Título',
      'Cliente ID',
      'Cliente',
      'Estado',
      'Prioridad',
      'Vencimiento',
      'Total',
      'Moneda',
      'Descripción',
      'Creada',
      'Actualizada',
    ]);
    expect(header(workbook.getWorksheet('Pagos')!)).toEqual([
      'ID',
      'Recibo',
      'Fecha',
      'Estado',
      'Monto',
      'Moneda',
      'Medio',
      'Concepto',
      'Orden ID',
      'Orden',
      'Cliente',
      'CUIT/DNI cliente',
      'Notas',
      'Registrado por',
      'Registrado el',
      'Anulado el',
      'Motivo de anulación',
    ]);
  });

  it('writes one row per record after the header', async () => {
    const workbook = await roundTrip(snapshot());

    expect(workbook.getWorksheet('Clientes')!.rowCount).toBe(2);
    expect(workbook.getWorksheet('Órdenes')!.rowCount).toBe(3);
    expect(workbook.getWorksheet('Pagos')!.rowCount).toBe(3);
  });

  it('shows the client ID and name on each order', async () => {
    const workbook = await roundTrip(snapshot());

    expect(rowBy(workbook.getWorksheet('Órdenes')!, 'ID', 'o1')).toMatchObject({
      'Cliente ID': 'c1',
      Cliente: 'Ana Pérez',
      Estado: 'En progreso',
      Prioridad: 'Alta',
      Total: 3000,
      Moneda: 'ARS',
    });
  });

  it('keeps the client ID and leaves the name empty when the client is missing', async () => {
    const workbook = await roundTrip(snapshot());

    const row = rowBy(workbook.getWorksheet('Órdenes')!, 'ID', 'o2');
    expect(row['Cliente ID']).toBe('gone');
    expect(row.Cliente ?? null).toBeNull();
    expect(row.Total ?? null).toBeNull();
  });

  it('shows the order ID, order title and client name on each payment', async () => {
    const workbook = await roundTrip(snapshot());

    expect(rowBy(workbook.getWorksheet('Pagos')!, 'ID', 'p1')).toMatchObject({
      Recibo: 11,
      Estado: 'Activo',
      'Orden ID': 'o1',
      Orden: 'Reparación techo',
      Cliente: 'Ana Pérez',
      Medio: 'Transferencia bancaria',
      Concepto: 'Anticipo',
      'Registrado por': 'Ada Admin',
    });
  });

  it('writes amounts as numbers in major units with a two-decimal format', async () => {
    const workbook = await roundTrip(snapshot());
    const sheet = workbook.getWorksheet('Pagos')!;

    const row = rowBy(sheet, 'ID', 'p1');
    expect(row.Monto).toBe(1500.5);
    expect(row.Moneda).toBe('ARS');
    const amountColumn = header(sheet).indexOf('Monto') + 1;
    expect(sheet.getRow(2).getCell(amountColumn).numFmt).toBe('#,##0.00');
  });

  it('marks voided payments with their void date and reason', async () => {
    const workbook = await roundTrip(snapshot());

    const row = rowBy(workbook.getWorksheet('Pagos')!, 'Recibo', 12);
    expect(row.Estado).toBe('Anulado');
    expect(row['Motivo de anulación']).toBe('Monto equivocado');
    // 15:30 UTC is 12:30 in Buenos Aires.
    expect(row['Anulado el']).toEqual(new Date(Date.UTC(2026, 7, 11, 12, 30)));
  });

  it('writes dates as date cells: calendar dates as is, timestamps in Buenos Aires time', async () => {
    const workbook = await roundTrip(snapshot());

    const order = rowBy(workbook.getWorksheet('Órdenes')!, 'ID', 'o1');
    expect(order.Vencimiento).toEqual(new Date(Date.UTC(2026, 8, 1)));
    expect(order.Creada).toEqual(new Date(Date.UTC(2026, 7, 3, 10, 0)));
    const paymentRow = rowBy(workbook.getWorksheet('Pagos')!, 'ID', 'p1');
    expect(paymentRow.Fecha).toEqual(new Date(Date.UTC(2026, 7, 10)));
  });

  it('builds the three sheets with only headers when there are no records', async () => {
    const workbook = await roundTrip(snapshot({ clients: [], workOrders: [], payments: [] }));

    expect(workbook.worksheets.map((s) => [s.name, s.rowCount])).toEqual([
      ['Clientes', 1],
      ['Órdenes', 1],
      ['Pagos', 1],
    ]);
  });
});
