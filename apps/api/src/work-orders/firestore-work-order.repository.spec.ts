import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { ConfigService } from '@nestjs/config';
import { FirestoreWorkOrderRepository } from './firestore-work-order.repository';
import { ApiEnvironment } from '../config/env';
import { ConflictError, ValidationError } from '../common/errors';
import { PAYMENT_ERROR_CODES } from '@ijac/shared';

const stamp = new Date('2026-08-01T10:00:00.000Z');

function createRepository(
  existing: Record<string, unknown> | null = {},
  payments: Array<{ amountMinor: number; status: string }> = [],
) {
  const snapshot = (data: Record<string, unknown>) => ({
    id: 'wo-1',
    exists: true,
    get: (field: string) => data[field],
    data: () => ({ ...data, createdAt: stamp, updatedAt: stamp }),
  });
  const paymentsRef = { id: 'payments' };
  const ref = {
    id: 'wo-1',
    collection: jest.fn().mockImplementation((name: string) => {
      if (name !== 'payments') throw new Error(`unexpected subcollection ${name}`);
      return paymentsRef;
    }),
    get: jest.fn().mockImplementation(async () => snapshot({ ...(existing ?? {}) })),
  };
  const clientRef = { id: 'c1' };
  const tx = {
    get: jest
      .fn()
      .mockImplementation(async (target: unknown) =>
        target === paymentsRef
          ? { docs: payments.map((data) => ({ data: () => data })) }
          : target === ref
            ? existing === null
              ? { exists: false }
              : snapshot({ clientId: 'c1', ...existing })
            : { exists: true },
      ),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const collection = {
    doc: jest.fn().mockImplementation((id?: string) => (id === 'c1' ? clientRef : ref)),
  };
  const firestore = {
    collection: jest.fn().mockReturnValue(collection),
    runTransaction: jest.fn().mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as Firestore;
  const config = {
    get: jest.fn().mockReturnValue('global'),
  } as unknown as ConfigService<ApiEnvironment>;
  return { repository: new FirestoreWorkOrderRepository(firestore, config), tx, ref, paymentsRef };
}

const createInput = {
  title: 'Setup',
  status: 'open',
  priority: 'normal',
  clientId: 'c1',
};

describe('FirestoreWorkOrderRepository pricing', () => {
  it('stores price and currency on create', async () => {
    const { repository, tx } = createRepository();
    await repository.create('org', { ...createInput, totalPriceMinor: 15000000, currency: 'ARS' });
    expect(tx.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalPriceMinor: 15000000, currency: 'ARS' }),
    );
  });

  it('omits price fields for an unpriced work order', async () => {
    const { repository, tx } = createRepository();
    await repository.create('org', createInput);
    const stored = tx.create.mock.calls[0][1] as Record<string, unknown>;
    expect(stored).not.toHaveProperty('totalPriceMinor');
    expect(stored).not.toHaveProperty('currency');
  });

  it('returns stored price and currency when reading', async () => {
    const { repository } = createRepository({ totalPriceMinor: 5000, currency: 'USD' });
    const order = await repository.findById('org', 'wo-1');
    expect(order).toEqual(expect.objectContaining({ totalPriceMinor: 5000, currency: 'USD' }));
  });

  it('sets price and currency on update', async () => {
    const { repository, tx } = createRepository({});
    await repository.update('org', 'wo-1', { totalPriceMinor: 900, currency: 'USD' });
    expect(tx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalPriceMinor: 900, currency: 'USD' }),
    );
  });

  it('reuses the stored currency when only the price changes', async () => {
    const { repository, tx } = createRepository({ totalPriceMinor: 100, currency: 'USD' });
    await repository.update('org', 'wo-1', { totalPriceMinor: 900 });
    expect(tx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalPriceMinor: 900, currency: 'USD' }),
    );
  });

  it('rejects a price on an order with no stored currency and none in the request', async () => {
    const { repository, tx } = createRepository({});
    const error = await repository
      .update('org', 'wo-1', { totalPriceMinor: 900 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual(['currency']);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects a currency on an order that has no price', async () => {
    const { repository, tx } = createRepository({});
    const error = await repository
      .update('org', 'wo-1', { currency: 'USD' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual(['totalPriceMinor']);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('changes only the currency of a priced order', async () => {
    const { repository, tx } = createRepository({ totalPriceMinor: 100, currency: 'ARS' });
    await repository.update('org', 'wo-1', { currency: 'USD' });
    const update = tx.update.mock.calls[0][1] as Record<string, unknown>;
    expect(update.currency).toBe('USD');
    expect(update).not.toHaveProperty('totalPriceMinor');
  });

  it('clears both price and currency when totalPriceMinor is null', async () => {
    const { repository, tx } = createRepository({ totalPriceMinor: 100, currency: 'ARS' });
    await repository.update('org', 'wo-1', { totalPriceMinor: null });
    expect(tx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        totalPriceMinor: FieldValue.delete(),
        currency: FieldValue.delete(),
      }),
    );
  });

  it('includes price and currency in list summaries', async () => {
    const { repository } = createRepository();
    const doc = {
      id: 'wo-1',
      get: (f: string) => (f === 'clientId' ? 'c1' : undefined),
      data: () => ({
        title: 'A',
        status: 'open',
        priority: 'low',
        clientId: 'c1',
        totalPriceMinor: 700,
        currency: 'ARS',
        createdAt: stamp,
        updatedAt: stamp,
      }),
      ref: { collection: () => ({ get: async () => ({ docs: [] }) }) },
    };
    const query = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [doc] }),
    };
    (repository as unknown as { collection: () => unknown }).collection = () => query;
    (repository as unknown as { firestore: unknown }).firestore = {
      collection: jest.fn().mockReturnValue({ doc: jest.fn() }),
      getAll: jest.fn().mockResolvedValue([{ id: 'c1', exists: true, get: () => 'Acme' }]),
    };
    const result = await repository.findMany('org', {});
    expect(result.items[0]).toEqual(
      expect.objectContaining({ totalPriceMinor: 700, currency: 'ARS' }),
    );
  });

  it('adds paid and remaining amounts from active payments to priced summaries only', async () => {
    const { repository } = createRepository();
    const listDoc = (id: string, data: Record<string, unknown>, payments: unknown[] | null) => ({
      id,
      get: (f: string) => (f === 'clientId' ? 'c1' : undefined),
      data: () => ({
        status: 'open',
        priority: 'low',
        clientId: 'c1',
        createdAt: stamp,
        updatedAt: stamp,
        ...data,
      }),
      ref: {
        collection: (name: string) => {
          if (name !== 'payments' || payments === null)
            throw new Error(`unexpected read of ${name}`);
          return { get: async () => ({ docs: payments.map((p) => ({ data: () => p })) }) };
        },
      },
    });
    const priced = listDoc('wo-1', { title: 'Priced', totalPriceMinor: 700, currency: 'ARS' }, [
      { amountMinor: 200, status: 'active' },
      { amountMinor: 100, status: 'voided' },
    ]);
    const unpriced = listDoc('wo-2', { title: 'Unpriced' }, null);
    const query = {
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [priced, unpriced] }),
    };
    (repository as unknown as { collection: () => unknown }).collection = () => query;
    (repository as unknown as { firestore: unknown }).firestore = {
      collection: jest.fn().mockReturnValue({ doc: jest.fn() }),
      getAll: jest.fn().mockResolvedValue([{ id: 'c1', exists: true, get: () => 'Acme' }]),
    };

    const { items } = await repository.findMany('org', {});

    expect(items[0]).toEqual(
      expect.objectContaining({ totalPriceMinor: 700, paidMinor: 200, remainingMinor: 500 }),
    );
    expect(items[1]).not.toHaveProperty('paidMinor');
    expect(items[1]).not.toHaveProperty('remainingMinor');
  });
});

describe('FirestoreWorkOrderRepository payment guards', () => {
  const priced = { totalPriceMinor: 10000000, currency: 'ARS' };
  const active = (amountMinor: number) => ({ amountMinor, status: 'active' });
  const voided = (amountMinor: number) => ({ amountMinor, status: 'voided' });

  it('rejects a currency change when an active payment exists', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000)]);
    await expect(repository.update('org', 'wo-1', { currency: 'USD' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects a currency change sent together with a new total', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000)]);
    await expect(
      repository.update('org', 'wo-1', { totalPriceMinor: 20000000, currency: 'USD' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('accepts resending the same currency', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000)]);
    await repository.update('org', 'wo-1', { totalPriceMinor: 20000000, currency: 'ARS' });
    expect(tx.update).toHaveBeenCalled();
  });

  it('rejects clearing the price when an active payment exists', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000)]);
    await expect(
      repository.update('org', 'wo-1', { totalPriceMinor: null }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejects a total lower than the sum of active payments', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000), active(2000000)]);
    await expect(
      repository.update('org', 'wo-1', { totalPriceMinor: 4999999 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('accepts a total equal to the sum of active payments', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000), active(2000000)]);
    await repository.update('org', 'wo-1', { totalPriceMinor: 5000000 });
    expect(tx.update).toHaveBeenCalled();
  });

  it('accepts raising the total after a payment', async () => {
    const { repository, tx } = createRepository(priced, [active(3000000)]);
    await repository.update('org', 'wo-1', { totalPriceMinor: 20000000 });
    expect(tx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalPriceMinor: 20000000 }),
    );
  });

  it('ignores voided payments, allowing a currency change, a lower total and clearing', async () => {
    for (const input of [{ currency: 'USD' }, { totalPriceMinor: 1 }, { totalPriceMinor: null }]) {
      const { repository, tx } = createRepository(priced, [voided(3000000)]);
      await repository.update('org', 'wo-1', input);
      expect(tx.update).toHaveBeenCalled();
    }
  });

  it('does not read payments when pricing is untouched', async () => {
    const { repository, tx, paymentsRef } = createRepository(priced, [active(3000000)]);
    await repository.update('org', 'wo-1', { title: 'Renamed' });
    expect(tx.get).not.toHaveBeenCalledWith(paymentsRef);
    expect(tx.update).toHaveBeenCalled();
  });
});

describe('FirestoreWorkOrderRepository delete', () => {
  it.each([
    ['an active', 'active'],
    ['only a voided', 'voided'],
  ])('rejects deleting a work order with %s payment', async (_label, status) => {
    const { repository, tx } = createRepository({}, [{ amountMinor: 3000000, status }]);

    const error = await repository.delete('org', 'wo-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).code).toBe(PAYMENT_ERROR_CODES.WORK_ORDER_HAS_PAYMENTS);
    expect(tx.delete).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('deletes a work order without payments and decrements the client count', async () => {
    const { repository, tx, ref } = createRepository({}, []);

    await repository.delete('org', 'wo-1');

    expect(tx.delete).toHaveBeenCalledWith(ref);
    expect(tx.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
      expect.objectContaining({ workOrderCount: expect.anything() }),
    );
  });
});
