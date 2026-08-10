import { OrganizationMigrationService } from './organization-migration.service';
import { Firestore } from 'firebase-admin/firestore';

describe('OrganizationMigrationService', () => {
  function createMockFirestore(): Firestore {
    const collections: Record<
      string,
      { docs: Map<string, unknown> }
    > = {};

    const getCollection = (path: string) => {
      if (!collections[path]) {
        collections[path] = { docs: new Map() };
      }
      return collections[path];
    };

    const createCollectionRef = (path: string): Record<string, jest.Mock> => {
      const col = getCollection(path);
      return {
        doc: jest.fn((id: string) => ({
          get: jest.fn(async () => ({
            exists: col.docs.has(id),
            id,
            data: () => col.docs.get(id),
          })),
          set: jest.fn(async (data: unknown) => {
            col.docs.set(id, data);
          }),
          collection: jest.fn((subPath: string) => {
            return createCollectionRef(`${path}/${id}/${subPath}`);
          }),
        })),
        get: jest.fn(async () => ({
          docs: Array.from(col.docs.entries()).map(([id, data]) => ({
            id,
            data: () => data,
            get: (field: string) => (data as Record<string, unknown>)[field],
          })),
        })),
      };
    };

    return {
      collection: jest.fn((path: string) => createCollectionRef(path)),
    } as unknown as Firestore;
  }

  it('detects orphaned work orders', async () => {
    const firestore = createMockFirestore();
    const service = new OrganizationMigrationService(firestore, {
      get: jest.fn().mockReturnValue('default-org'),
    } as any);

    // Add a work order without a corresponding client
    await firestore.collection('workOrders').doc('wo-1').set({
      title: 'Test',
      clientId: 'missing-client',
    });

    const result = await service.migrate(true);

    expect(result.success).toBe(false);
    expect(result.workOrdersOrphaned).toBe(1);
    expect(result.errors).toContain(
      'Orphaned work order wo-1 references missing client missing-client',
    );
  });

  it('copies clients and work orders in dry-run without writing', async () => {
    const firestore = createMockFirestore();
    const service = new OrganizationMigrationService(firestore, {
      get: jest.fn().mockReturnValue('default-org'),
    } as any);

    await firestore.collection('clients').doc('client-1').set({
      name: 'Acme',
      email: 'acme@test.com',
    });

    await firestore.collection('workOrders').doc('wo-1').set({
      title: 'Test',
      clientId: 'client-1',
    });

    const result = await service.migrate(true);

    expect(result.success).toBe(true);
    expect(result.clientsCopied).toBe(1);
    expect(result.workOrdersCopied).toBe(1);

    // Verify no writes occurred
    const targetClient = await firestore
      .collection('organizations/default-org/clients')
      .doc('client-1')
      .get();
    expect(targetClient.exists).toBe(false);
  });

  it('copies clients and work orders in apply mode', async () => {
    const firestore = createMockFirestore();
    const service = new OrganizationMigrationService(firestore, {
      get: jest.fn().mockReturnValue('default-org'),
    } as any);

    await firestore.collection('clients').doc('client-1').set({
      name: 'Acme',
      email: 'acme@test.com',
    });

    await firestore.collection('workOrders').doc('wo-1').set({
      title: 'Test',
      clientId: 'client-1',
    });

    const result = await service.migrate(false);

    expect(result.success).toBe(true);
    expect(result.clientsCopied).toBe(1);
    expect(result.workOrdersCopied).toBe(1);

    // Verify writes occurred
    const targetClient = await firestore
      .collection('organizations/default-org/clients')
      .doc('client-1')
      .get();
    expect(targetClient.exists).toBe(true);
  });

  it('skips already migrated matching documents', async () => {
    const firestore = createMockFirestore();
    const service = new OrganizationMigrationService(firestore, {
      get: jest.fn().mockReturnValue('default-org'),
    } as any);

    await firestore.collection('clients').doc('client-1').set({
      name: 'Acme',
      email: 'acme@test.com',
    });

    await firestore
      .collection('organizations/default-org/clients')
      .doc('client-1')
      .set({
        name: 'Acme',
        email: 'acme@test.com',
      });

    const result = await service.migrate(false);

    expect(result.success).toBe(true);
    expect(result.clientsSkipped).toBe(1);
    expect(result.clientsCopied).toBe(0);
  });

  it('detects conflicts when target has different data', async () => {
    const firestore = createMockFirestore();
    const service = new OrganizationMigrationService(firestore, {
      get: jest.fn().mockReturnValue('default-org'),
    } as any);

    await firestore.collection('clients').doc('client-1').set({
      name: 'Acme',
      email: 'acme@test.com',
    });

    await firestore
      .collection('organizations/default-org/clients')
      .doc('client-1')
      .set({
        name: 'Different',
        email: 'different@test.com',
      });

    const result = await service.migrate(false);

    expect(result.success).toBe(false);
    expect(result.clientsConflicts).toBe(1);
    expect(result.errors).toContain(
      'Client client-1 exists in target with different data',
    );
  });
});
