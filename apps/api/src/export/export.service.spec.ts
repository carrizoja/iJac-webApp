import { Client, DATA_EXPORT_FORMAT_VERSION, Payment, WorkOrder } from '@ijac/shared';
import { ClientRepository } from '../clients/client.repository';
import { PaymentRepository } from '../payments/payment.repository';
import { WorkOrderRepository } from '../work-orders/work-order.repository';
import { ExportService } from './export.service';

function service(
  data: Record<string, { clients: Client[]; workOrders: WorkOrder[]; payments: Payment[] }>,
) {
  const of = (org: string) => data[org] ?? { clients: [], workOrders: [], payments: [] };
  const clients = { listAll: jest.fn(async (org: string) => of(org).clients) };
  const workOrders = { listAll: jest.fn(async (org: string) => of(org).workOrders) };
  const payments = { listAll: jest.fn(async (org: string) => of(org).payments) };
  return new ExportService(
    clients as unknown as ClientRepository,
    workOrders as unknown as WorkOrderRepository,
    payments as unknown as PaymentRepository,
  );
}

const client = { id: 'c1', name: 'Ana Pérez' } as Client;
const workOrder = { id: 'o1', title: 'Reparación techo', clientId: 'c1' } as WorkOrder;
const payment = { id: 'p1', workOrderId: 'o1', receiptNumber: 1 } as Payment;

describe('ExportService.collect', () => {
  it("returns the organization's three collections with the export header", async () => {
    const exportService = service({
      'org-a': { clients: [client], workOrders: [workOrder], payments: [payment] },
      'org-b': { clients: [{ id: 'other' } as Client], workOrders: [], payments: [] },
    });

    const result = await exportService.collect('org-a', new Date('2026-11-12T15:30:00.000Z'));

    expect(result).toEqual({
      formatVersion: DATA_EXPORT_FORMAT_VERSION,
      exportedAt: '2026-11-12T15:30:00.000Z',
      organizationId: 'org-a',
      clients: [client],
      workOrders: [workOrder],
      payments: [payment],
    });
  });

  it('returns empty collections for an organization with no records', async () => {
    const result = await service({}).collect('org-empty', new Date('2026-11-12T15:30:00.000Z'));

    expect(result).toMatchObject({ clients: [], workOrders: [], payments: [] });
  });
});
