import { Firestore } from 'firebase-admin/firestore';
import { ConfigService } from '@nestjs/config';
import { FirestoreClientRepository } from './firestore-client.repository';
import { ApiEnvironment } from '../config/env';

interface QueryDouble {
  orderBy: jest.Mock;
  limit: jest.Mock;
  where: jest.Mock;
  startAfter: jest.Mock;
  get: jest.Mock;
  doc: jest.Mock;
}

function createQueryDouble(): QueryDouble {
  const query = {
    orderBy: jest.fn(),
    limit: jest.fn(),
    where: jest.fn(),
    startAfter: jest.fn(),
    get: jest.fn(),
    doc: jest.fn(),
  };
  query.orderBy.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.startAfter.mockReturnValue(query);
  query.get.mockResolvedValue({ docs: [] });
  return query;
}

function createRepository(query: QueryDouble): FirestoreClientRepository {
  const firestore = {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(query),
      }),
    }),
  } as unknown as Firestore;
  const config = {
    get: jest.fn().mockReturnValue('organization'),
  } as unknown as ConfigService<ApiEnvironment>;
  return new FirestoreClientRepository(firestore, config);
}

function clientDocument(id: string): FirebaseFirestore.QueryDocumentSnapshot {
  return {
    id,
    data: () => ({
      name: 'Acme Inc',
      email: 'hello@acme.test',
      phone: '555-0100',
      organization: 'Acme',
      notes: '',
      searchPrefixes: ['a', 'ac', 'acm', 'acme'],
      workOrderCount: 0,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-07T10:00:00.000Z'),
    }),
  } as unknown as FirebaseFirestore.QueryDocumentSnapshot;
}

describe('FirestoreClientRepository.findMany', () => {
  it('uses the legacy global collection before migration cutover', async () => {
    const query = createQueryDouble();
    const collection = jest.fn().mockReturnValue(query);
    const firestore = { collection } as unknown as Firestore;
    const config = {
      get: jest.fn().mockReturnValue('global'),
    } as unknown as ConfigService<ApiEnvironment>;
    const repository = new FirestoreClientRepository(firestore, config);

    await repository.findMany('user-1', {});

    expect(collection).toHaveBeenCalledWith('clients');
  });

  it('normalizes prefix search and returns an empty page without error', async () => {
    const query = createQueryDouble();
    const repository = createRepository(query);

    await expect(
      repository.findMany('user-1', { search: '  AcMe  ', limit: 5 }),
    ).resolves.toEqual({ items: [], nextCursor: undefined });

    expect(query.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.where).toHaveBeenCalledWith(
      'searchPrefixes',
      'array-contains',
      'acme',
    );
  });

  it('caps the requested page size at 100 clients', async () => {
    const query = createQueryDouble();
    const repository = createRepository(query);

    await repository.findMany('user-1', { limit: 500 });

    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it('maps a full page and returns the last document as the next cursor', async () => {
    const query = createQueryDouble();
    query.get.mockResolvedValue({ docs: [clientDocument('client-1')] });
    const repository = createRepository(query);

    const result = await repository.findMany('user-1', { limit: 1 });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'client-1',
          name: 'Acme Inc',
          updatedAt: '2026-08-07T10:00:00.000Z',
        }),
      ],
      nextCursor: 'client-1',
    });
  });
});
