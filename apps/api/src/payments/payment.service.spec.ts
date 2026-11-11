import { Test } from '@nestjs/testing';
import {
  Currency,
  Payment,
  PaymentConcept,
  PaymentMethod,
  PaymentStatus,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@ijac/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { PAYMENT_REPOSITORY } from './payment.constants';
import { PaymentService } from './payment.service';

const actor = { uid: 'u1', email: 'a@x.test', displayName: 'Ada' };

const workOrder = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({
  id: 'wo-1',
  title: 'Job',
  status: WorkOrderStatus.OPEN,
  priority: WorkOrderPriority.NORMAL,
  clientId: 'c1',
  totalPriceMinor: 10000000,
  currency: Currency.ARS,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const payment = (amountMinor: number, status = PaymentStatus.ACTIVE): Payment => ({
  id: `p-${amountMinor}`,
  workOrderId: 'wo-1',
  receiptNumber: 1,
  amountMinor,
  currency: Currency.ARS,
  paymentDate: '2026-08-10',
  method: PaymentMethod.CASH,
  status,
  concept: PaymentConcept.ADVANCE,
  issuer: { businessName: 'iJac', cuit: '20123456786', address: 'A', phone: '1' },
  client: { name: 'Acme' },
  workOrderTitle: 'Job',
  recordedBy: actor,
  createdAt: '2026-08-10T00:00:00.000Z',
});

const validInput = {
  amountMinor: 3000000,
  paymentDate: '2026-08-10',
  method: PaymentMethod.BANK_TRANSFER,
};

describe('PaymentService', () => {
  let service: PaymentService;
  let workOrders: { findById: jest.Mock };
  let payments: {
    findByWorkOrder: jest.Mock;
    findByPaymentDate: jest.Mock;
    record: jest.Mock;
    voidPayment: jest.Mock;
  };

  beforeEach(async () => {
    workOrders = { findById: jest.fn().mockResolvedValue(workOrder()) };
    payments = {
      findByWorkOrder: jest.fn().mockResolvedValue([]),
      findByPaymentDate: jest.fn().mockResolvedValue([]),
      record: jest.fn().mockImplementation(async () => payment(3000000)),
      voidPayment: jest.fn().mockImplementation(async () => payment(3000000, PaymentStatus.VOIDED)),
    };
    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: WORK_ORDER_REPOSITORY, useValue: workOrders },
        { provide: PAYMENT_REPOSITORY, useValue: payments },
      ],
    }).compile();
    service = module.get(PaymentService);
  });

  describe('list', () => {
    it('returns payments with the balance of active ones', async () => {
      payments.findByWorkOrder.mockResolvedValue([
        payment(3000000),
        payment(2000000),
        payment(1000000, PaymentStatus.VOIDED),
      ]);

      const result = await service.list('org-1', 'wo-1');

      expect(result.items).toHaveLength(3);
      expect(result.balance).toEqual({
        currency: Currency.ARS,
        totalMinor: 10000000,
        paidMinor: 5000000,
        remainingMinor: 5000000,
      });
    });

    it('reports paid 0 and the full remaining with no payments', async () => {
      const result = await service.list('org-1', 'wo-1');
      expect(result.balance).toEqual({
        currency: Currency.ARS,
        totalMinor: 10000000,
        paidMinor: 0,
        remainingMinor: 10000000,
      });
    });

    it('returns a null balance for an unpriced work order', async () => {
      workOrders.findById.mockResolvedValue(
        workOrder({ totalPriceMinor: undefined, currency: undefined }),
      );
      const result = await service.list('org-1', 'wo-1');
      expect(result).toEqual({ items: [], balance: null });
    });

    it('treats a missing work order as not found without reading payments', async () => {
      workOrders.findById.mockResolvedValue(null);
      await expect(service.list('org-1', 'wo-1')).rejects.toBeInstanceOf(NotFoundError);
      expect(payments.findByWorkOrder).not.toHaveBeenCalled();
    });
  });

  describe('listByDate', () => {
    it('lists the active payments of the day with a total per currency, never mixed', async () => {
      const dollars = { ...payment(5000), id: 'usd', currency: Currency.USD };
      payments.findByPaymentDate.mockResolvedValue([
        payment(3000000),
        payment(1000000, PaymentStatus.VOIDED),
        dollars,
        { ...payment(2000000), id: 'p-2b' },
      ]);

      const result = await service.listByDate('org-1', '2026-08-10');

      expect(payments.findByPaymentDate).toHaveBeenCalledWith('org-1', '2026-08-10');
      expect(result.date).toBe('2026-08-10');
      expect(result.items.map((p) => p.id)).toEqual(['p-3000000', 'usd', 'p-2b']);
      expect(result.totals).toEqual([
        { currency: Currency.ARS, amountMinor: 5000000 },
        { currency: Currency.USD, amountMinor: 5000 },
      ]);
    });

    it('returns no items and no totals for a day without payments', async () => {
      await expect(service.listByDate('org-1', '2026-08-10')).resolves.toEqual({
        date: '2026-08-10',
        items: [],
        totals: [],
      });
    });

    it.each(['2026-02-30', '10/08/2026', ''])('rejects %p as a date', async (date) => {
      await expect(service.listByDate('org-1', date)).rejects.toBeInstanceOf(ValidationError);
      expect(payments.findByPaymentDate).not.toHaveBeenCalled();
    });
  });

  describe('record', () => {
    it('delegates a valid payment with the actor', async () => {
      await service.record('org-1', 'wo-1', { ...validInput, notes: ' ok ' }, actor);
      expect(payments.record).toHaveBeenCalledWith(
        'org-1',
        'wo-1',
        { ...validInput, notes: 'ok' },
        actor,
      );
    });

    it('forwards the idempotency key to the repository', async () => {
      const idempotencyKey = '3f1c2a9e-5b7d-4c1e-9a2b-6d8e0f1a2b3c';
      await service.record('org-1', 'wo-1', { ...validInput, idempotencyKey }, actor);
      expect(payments.record).toHaveBeenCalledWith(
        'org-1',
        'wo-1',
        { ...validInput, idempotencyKey },
        actor,
      );
    });

    it.each([
      ['zero', { amountMinor: 0 }, 'amountMinor'],
      ['negative', { amountMinor: -5 }, 'amountMinor'],
      ['fractional', { amountMinor: 1.5 }, 'amountMinor'],
      ['unsafe', { amountMinor: Number.MAX_SAFE_INTEGER + 1 }, 'amountMinor'],
      ['missing date', { paymentDate: '' }, 'paymentDate'],
      ['malformed date', { paymentDate: '10/08/2026' }, 'paymentDate'],
      ['impossible date', { paymentDate: '2026-02-30' }, 'paymentDate'],
      ['unknown method', { method: 'bitcoin' as PaymentMethod }, 'method'],
      ['long notes', { notes: 'x'.repeat(501) }, 'notes'],
    ])('rejects %s with a field error and stores nothing', async (_name, override, field) => {
      const error = await service
        .record('org-1', 'wo-1', { ...validInput, ...override }, actor)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual([field]);
      expect(payments.record).not.toHaveBeenCalled();
    });

    it('accepts a leap day', async () => {
      await service.record('org-1', 'wo-1', { ...validInput, paymentDate: '2028-02-29' }, actor);
      expect(payments.record).toHaveBeenCalled();
    });
  });

  describe('voidPayment', () => {
    it('delegates with a trimmed reason', async () => {
      await service.voidPayment('org-1', 'wo-1', 'p-1', '  Monto cargado por error ', actor);
      expect(payments.voidPayment).toHaveBeenCalledWith(
        'org-1',
        'wo-1',
        'p-1',
        'Monto cargado por error',
        actor,
      );
    });

    it.each([[''], ['   '], ['x'.repeat(501)]])('rejects reason %j', async (reason) => {
      const error = await service
        .voidPayment('org-1', 'wo-1', 'p-1', reason, actor)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual(['reason']);
      expect(payments.voidPayment).not.toHaveBeenCalled();
    });
  });
});
