import { FieldValue, Firestore } from 'firebase-admin/firestore';
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

    await expect(repository.findMany('user-1', { search: '  AcMe  ', limit: 5 })).resolves.toEqual({
      items: [],
      nextCursor: undefined,
    });

    expect(query.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.where).toHaveBeenCalledWith('searchPrefixes', 'array-contains', 'acme');
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

describe('FirestoreClientRepository taxId persistence', () => {
  function createWriteRepository(existing: Record<string, unknown> = {}) {
    const ref = {
      id: 'client-1',
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        id: 'client-1',
        exists: true,
        get: (field: string) => existing[field],
        data: () => ({
          ...existing,
          createdAt: new Date('2026-08-01T10:00:00.000Z'),
          updatedAt: new Date('2026-08-01T10:00:00.000Z'),
        }),
      }),
    };
    const collection = { doc: jest.fn().mockReturnValue(ref) };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue(collection),
        }),
      }),
    } as unknown as Firestore;
    const config = {
      get: jest.fn().mockReturnValue('organization'),
    } as unknown as ConfigService<ApiEnvironment>;
    return { ref, repository: new FirestoreClientRepository(firestore, config) };
  }

  const required = { name: 'Acme', email: 'a@acme.test', phone: '555' };

  it('stores taxId on create and keeps it out of search prefixes', async () => {
    const { ref, repository } = createWriteRepository();
    await repository.create('org-1', { ...required, taxId: '20123456786' });
    const saved = ref.set.mock.calls[0][0];
    expect(saved.taxId).toBe('20123456786');
    expect(saved.searchPrefixes).not.toContain('2012');
  });

  it('omits taxId on create when absent', async () => {
    const { ref, repository } = createWriteRepository();
    await repository.create('org-1', required);
    expect(ref.set.mock.calls[0][0]).not.toHaveProperty('taxId');
  });

  it('sets taxId on update', async () => {
    const { ref, repository } = createWriteRepository(required);
    await repository.update('org-1', 'client-1', { taxId: '12345678' });
    expect(ref.update.mock.calls[0][0].taxId).toBe('12345678');
  });

  it('deletes the stored field when update receives an empty taxId', async () => {
    const { ref, repository } = createWriteRepository({
      ...required,
      taxId: '12345678',
    });
    await repository.update('org-1', 'client-1', { taxId: '' });
    const patch = ref.update.mock.calls[0][0];
    expect(patch.taxId).toBeInstanceOf(FieldValue.delete().constructor);
  });
});

describe('FirestoreClientRepository.listAll', () => {
  function setup(docsByPath: Record<string, FirebaseFirestore.QueryDocumentSnapshot[]>) {
    const paths: string[] = [];
    const collectionAt = (path: string) => ({
      get: jest.fn().mockImplementation(async () => {
        paths.push(path);
        return { docs: docsByPath[path] ?? [] };
      }),
    });
    const firestore = {
      collection: jest.fn().mockImplementation((root: string) => ({
        ...collectionAt(root),
        doc: (id: string) => ({
          collection: (name: string) => collectionAt(`${root}/${id}/${name}`),
        }),
      })),
    } as unknown as Firestore;
    const config = {
      get: jest.fn().mockReturnValue('organization'),
    } as unknown as ConfigService<ApiEnvironment>;
    return { repository: new FirestoreClientRepository(firestore, config), paths };
  }

  it('returns every client of the organization, and only that organization', async () => {
    const { repository, paths } = setup({
      'organizations/org-a/clients': [clientDocument('c1'), clientDocument('c2')],
      'organizations/org-b/clients': [clientDocument('other')],
    });

    const items = await repository.listAll('org-a');

    expect(items.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(items[0]).toMatchObject({
      name: 'Acme Inc',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-07T10:00:00.000Z',
    });
    expect(paths).toEqual(['organizations/org-a/clients']);
  });

  it('returns an empty list for an organization with no clients', async () => {
    const { repository } = setup({});

    await expect(repository.listAll('org-a')).resolves.toEqual([]);
  });
});
