import { ConfigService } from '@nestjs/config';
import { Firestore } from 'firebase-admin/firestore';
import {
  Currency,
  PaymentConcept,
  PaymentMethod,
  PaymentStatus,
  WorkOrderStatus,
} from '@ijac/shared';
import { ApiEnvironment } from '../config/env';
import { ConflictError, NotFoundError, ValidationError } from '../common/errors';
import { FirestorePaymentRepository } from './firestore-payment.repository';

type Data = Record<string, unknown>;

/** Minimal in-memory Firestore: path-keyed documents plus transactions. */
class FakeFirestore {
  readonly docs = new Map<string, Data>();
  private autoId = 0;

  collection(path: string): FakeCollection {
    return new FakeCollection(this, path);
  }

  nextId(): string {
    this.autoId += 1;
    return `pay-${this.autoId}`;
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    return fn(new FakeTransaction(this));
  }

  snapshot(path: string) {
    const data = this.docs.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: data !== undefined,
      data: () => data,
      get: (field: string) => data?.[field],
    };
  }
}

class FakeDoc {
  constructor(
    readonly store: FakeFirestore,
    readonly path: string,
  ) {}
  get id() {
    return this.path.split('/').pop() as string;
  }
  collection(name: string) {
    return new FakeCollection(this.store, `${this.path}/${name}`);
  }
}

class FakeCollection {
  constructor(
    readonly store: FakeFirestore,
    readonly path: string,
  ) {}
  doc(id?: string) {
    return new FakeDoc(this.store, `${this.path}/${id ?? this.store.nextId()}`);
  }
  async get() {
    return this.query();
  }
  query() {
    const prefix = `${this.path}/`;
    const docs = [...this.store.docs.keys()]
      .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map((key) => this.store.snapshot(key));
    return { docs };
  }
}

class FakeTransaction {
  constructor(private readonly store: FakeFirestore) {}
  async get(target: FakeDoc | FakeCollection) {
    return target instanceof FakeDoc ? this.store.snapshot(target.path) : target.query();
  }
  create(ref: FakeDoc, data: Data) {
    this.store.docs.set(ref.path, data);
  }
  set(ref: FakeDoc, data: Data) {
    this.store.docs.set(ref.path, data);
  }
  update(ref: FakeDoc, data: Data) {
    this.store.docs.set(ref.path, { ...(this.store.docs.get(ref.path) ?? {}), ...data });
  }
}

const admin = { uid: 'admin-1', email: 'admin@x.test', displayName: 'Ada Admin' };
const profile = { businessName: 'iJac SRL', cuit: '20123456786', address: 'Calle 1', phone: '555' };
const input = {
  amountMinor: 3000000,
  paymentDate: '2026-08-10',
  method: PaymentMethod.BANK_TRANSFER,
};

interface Layout {
  workOrder: string;
  client: string;
  profileDoc: string;
  counter: string;
  payments: string;
}

function layout(mode: 'global' | 'organization', org: string, workOrderId = 'wo-1'): Layout {
  const root = mode === 'global' ? '' : `organizations/${org}/`;
  return {
    workOrder: `${root}workOrders/${workOrderId}`,
    client: `${root}clients/c1`,
    profileDoc: mode === 'global' ? 'settings/organization' : `organizations/${org}`,
    counter: `${root}counters/receipts`,
    payments: `${root}workOrders/${workOrderId}/payments`,
  };
}

function setup(mode: 'global' | 'organization') {
  const store = new FakeFirestore();
  const config = {
    get: jest.fn().mockReturnValue(mode),
  } as unknown as ConfigService<ApiEnvironment>;
  const repository = new FirestorePaymentRepository(store as unknown as Firestore, config);

  const seed = (org: string, workOrder: Data = {}, workOrderId = 'wo-1', configured = true) => {
    const paths = layout(mode, org, workOrderId);
    store.docs.set(paths.workOrder, {
      title: 'Install network',
      status: WorkOrderStatus.OPEN,
      clientId: 'c1',
      totalPriceMinor: 10000000,
      currency: Currency.ARS,
      ...workOrder,
    });
    store.docs.set(paths.client, { name: 'Acme', taxId: '30500010912' });
    if (configured) store.docs.set(paths.profileDoc, { profile });
    return paths;
  };

  return { store, repository, seed };
}

describe.each(['global', 'organization'] as const)(
  'FirestorePaymentRepository (%s mode)',
  (mode) => {
    const org = 'org-1';

    it('records the first payment as receipt 1 and advances the counter', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org);

      const payment = await repository.record(org, 'wo-1', input, admin);

      expect(payment).toEqual(
        expect.objectContaining({
          id: 'pay-1',
          workOrderId: 'wo-1',
          receiptNumber: 1,
          amountMinor: 3000000,
          currency: Currency.ARS,
          paymentDate: '2026-08-10',
          method: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.ACTIVE,
          concept: PaymentConcept.ADVANCE,
          recordedBy: admin,
        }),
      );
      expect(typeof payment.createdAt).toBe('string');
      expect(store.docs.get(paths.counter)).toEqual({ next: 2 });
      expect(store.docs.has(`${paths.payments}/pay-1`)).toBe(true);
    });

    it('stores issuer, client and title snapshots', async () => {
      const { repository, seed } = setup(mode);
      seed(org);

      const payment = await repository.record(org, 'wo-1', input, admin);

      expect(payment.issuer).toEqual(profile);
      expect(payment.client).toEqual({ name: 'Acme', taxId: '30500010912' });
      expect(payment.workOrderTitle).toBe('Install network');
    });

    it('omits the client tax id and empty notes when absent', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org);
      store.docs.set(paths.client, { name: 'Acme' });

      const payment = await repository.record(org, 'wo-1', { ...input, notes: '   ' }, admin);

      expect(payment.client).toEqual({ name: 'Acme' });
      expect(payment).not.toHaveProperty('notes');
    });

    it('keeps trimmed notes', async () => {
      const { repository, seed } = setup(mode);
      seed(org);
      const payment = await repository.record(org, 'wo-1', { ...input, notes: ' deposit ' }, admin);
      expect(payment.notes).toBe('deposit');
    });

    it('assigns consecutive numbers and never reuses one after a void', async () => {
      const { repository, seed } = setup(mode);
      seed(org);

      const first = await repository.record(org, 'wo-1', input, admin);
      const second = await repository.record(org, 'wo-1', input, admin);
      await repository.voidPayment(org, 'wo-1', second.id, 'Mistake', admin);
      const third = await repository.record(org, 'wo-1', input, admin);

      expect([first.receiptNumber, second.receiptNumber, third.receiptNumber]).toEqual([1, 2, 3]);
    });

    it('rejects an overpayment stating the remaining balance and writes nothing', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org);
      await repository.record(org, 'wo-1', { ...input, amountMinor: 9000000 }, admin);
      const before = new Map(store.docs);

      const error = await repository
        .record(org, 'wo-1', { ...input, amountMinor: 1000001 }, admin)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('$ 10.000,00');
      expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual(['amountMinor']);
      expect(store.docs).toEqual(before);
      expect(store.docs.get(paths.counter)).toEqual({ next: 2 });
    });

    it('marks a payment of exactly the remaining balance as the settlement', async () => {
      const { repository, seed } = setup(mode);
      seed(org);
      const advance = await repository.record(org, 'wo-1', input, admin);
      const settlement = await repository.record(
        org,
        'wo-1',
        { ...input, amountMinor: 7000000 },
        admin,
      );

      expect(advance.concept).toBe(PaymentConcept.ADVANCE);
      expect(settlement.concept).toBe(PaymentConcept.BALANCE_SETTLEMENT);
    });

    it('does not count voided payments toward the balance', async () => {
      const { repository, seed } = setup(mode);
      seed(org);
      const first = await repository.record(org, 'wo-1', { ...input, amountMinor: 6000000 }, admin);
      await repository.voidPayment(org, 'wo-1', first.id, 'Mistake', admin);

      const full = await repository.record(org, 'wo-1', { ...input, amountMinor: 10000000 }, admin);

      expect(full.concept).toBe(PaymentConcept.BALANCE_SETTLEMENT);
    });

    it('fully paid work orders reject further payments', async () => {
      const { repository, seed } = setup(mode);
      seed(org);
      await repository.record(org, 'wo-1', { ...input, amountMinor: 10000000 }, admin);
      await expect(
        repository.record(org, 'wo-1', { ...input, amountMinor: 1 }, admin),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects a payment on an unpriced work order', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org);
      store.docs.set(paths.workOrder, { title: 'T', status: 'open', clientId: 'c1' });

      await expect(repository.record(org, 'wo-1', input, admin)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(store.docs.has(paths.counter)).toBe(false);
    });

    it('rejects a payment on a cancelled work order', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org, { status: WorkOrderStatus.CANCELLED });

      await expect(repository.record(org, 'wo-1', input, admin)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(store.docs.has(paths.counter)).toBe(false);
    });

    it('rejects a payment when the organization profile is not configured', async () => {
      const { store, repository, seed } = setup(mode);
      const paths = seed(org, {}, 'wo-1', false);

      const error = await repository.record(org, 'wo-1', input, admin).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).message).toMatch(/organization profile/i);
      expect(store.docs.has(paths.counter)).toBe(false);
    });

    it('reports a missing work order and a missing client as not found', async () => {
      const { store, repository, seed } = setup(mode);
      await expect(repository.record(org, 'nope', input, admin)).rejects.toBeInstanceOf(
        NotFoundError,
      );

      const paths = seed(org);
      store.docs.delete(paths.client);
      await expect(repository.record(org, 'wo-1', input, admin)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    describe('void', () => {
      it('stores the reason, voiding admin and time and keeps the receipt number', async () => {
        const { repository, seed } = setup(mode);
        seed(org);
        const payment = await repository.record(org, 'wo-1', input, admin);
        const other = { uid: 'admin-2', email: null, displayName: null };

        const voided = await repository.voidPayment(
          org,
          'wo-1',
          payment.id,
          'Monto cargado por error',
          other,
        );

        expect(voided.status).toBe(PaymentStatus.VOIDED);
        expect(voided.receiptNumber).toBe(1);
        expect(voided.void).toEqual({
          reason: 'Monto cargado por error',
          voidedBy: other,
          voidedAt: expect.any(String),
        });
        expect(voided.recordedBy).toEqual(admin);
      });

      it('rejects voiding twice and keeps the original void data', async () => {
        const { repository, seed } = setup(mode);
        seed(org);
        const payment = await repository.record(org, 'wo-1', input, admin);
        const first = await repository.voidPayment(org, 'wo-1', payment.id, 'First', admin);

        await expect(
          repository.voidPayment(org, 'wo-1', payment.id, 'Second', admin),
        ).rejects.toBeInstanceOf(ConflictError);
        const [stored] = await repository.findByWorkOrder(org, 'wo-1');
        expect(stored.void).toEqual(first.void);
      });

      it('is allowed on a cancelled work order', async () => {
        const { store, repository, seed } = setup(mode);
        const paths = seed(org);
        const payment = await repository.record(org, 'wo-1', input, admin);
        store.docs.set(paths.workOrder, {
          ...store.docs.get(paths.workOrder),
          status: 'cancelled',
        });

        const voided = await repository.voidPayment(
          org,
          'wo-1',
          payment.id,
          'Cancelled job',
          admin,
        );

        expect(voided.status).toBe(PaymentStatus.VOIDED);
      });

      it('reports an unknown payment as not found', async () => {
        const { repository, seed } = setup(mode);
        seed(org);
        await expect(
          repository.voidPayment(org, 'wo-1', 'missing', 'Why', admin),
        ).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    it('lists payments ordered by receipt number, voided included', async () => {
      const { repository, seed } = setup(mode);
      seed(org);
      const first = await repository.record(org, 'wo-1', { ...input, amountMinor: 100 }, admin);
      await repository.record(org, 'wo-1', { ...input, amountMinor: 200 }, admin);
      await repository.voidPayment(org, 'wo-1', first.id, 'Mistake', admin);

      const items = await repository.findByWorkOrder(org, 'wo-1');

      expect(items.map((p) => [p.receiptNumber, p.status])).toEqual([
        [1, PaymentStatus.VOIDED],
        [2, PaymentStatus.ACTIVE],
      ]);
    });
  },
);

describe('FirestorePaymentRepository counter scope', () => {
  it('shares one counter across all owners in global mode', async () => {
    const { store, repository, seed } = setup('global');
    seed('uid-a', {}, 'wo-1');
    seed('uid-b', {}, 'wo-2');

    const a = await repository.record('uid-a', 'wo-1', input, admin);
    const b = await repository.record('uid-b', 'wo-2', input, admin);

    expect([a.receiptNumber, b.receiptNumber]).toEqual([1, 2]);
    expect(store.docs.get('counters/receipts')).toEqual({ next: 3 });
  });

  it('keeps an independent counter per organization in organization mode', async () => {
    const { store, repository, seed } = setup('organization');
    seed('org-a');
    seed('org-b');

    const a = await repository.record('org-a', 'wo-1', input, admin);
    const b = await repository.record('org-b', 'wo-1', input, admin);

    expect([a.receiptNumber, b.receiptNumber]).toEqual([1, 1]);
    expect(store.docs.get('organizations/org-a/counters/receipts')).toEqual({ next: 2 });
    expect(store.docs.get('organizations/org-b/counters/receipts')).toEqual({ next: 2 });
  });

  it('treats another organization work order as not found', async () => {
    const { repository, seed } = setup('organization');
    seed('org-a');
    await expect(repository.record('org-b', 'wo-1', input, admin)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      repository.voidPayment('org-b', 'wo-1', 'pay-1', 'x', admin),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
