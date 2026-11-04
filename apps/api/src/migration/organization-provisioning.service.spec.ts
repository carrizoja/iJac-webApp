import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { OrganizationProvisioningService } from './organization-provisioning.service';

type Doc = Record<string, unknown>;

/** In-memory Firestore covering the calls provisioning makes. */
function createFakeFirestore(seed: Record<string, Doc> = {}) {
  const docs = new Map<string, Doc>(Object.entries(seed));
  const ref = (path: string) => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const firestore = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const writes: Array<[string, Doc]> = [];
      const tx = {
        get: async (r: { path: string }) => ({
          exists: docs.has(r.path),
          data: () => docs.get(r.path),
        }),
        set: (r: { path: string }, data: Doc) => {
          writes.push([r.path, data]);
          return tx;
        },
      };
      const result = await fn(tx);
      for (const [path, data] of writes) docs.set(path, data);
      return result;
    },
  };
  return { firestore: firestore as unknown as Firestore, docs };
}

const admin = { uid: 'uid-1', email: 'owner@ijac.com.ar', role: 'admin' as const };

describe('OrganizationProvisioningService', () => {
  it('creates the organization, membership and locator with Firestore timestamps', async () => {
    const { firestore, docs } = createFakeFirestore();
    const service = new OrganizationProvisioningService(firestore);

    const result = await service.provision({
      organizationId: 'ijac',
      name: 'IJAC',
      members: [admin],
    });

    expect(result).toEqual({ organizationCreated: true, membersCreated: 1, membersUpdated: 0 });
    const org = docs.get('organizations/ijac')!;
    expect(org.name).toBe('IJAC');
    expect(org.createdAt).toBeInstanceOf(Timestamp);
    expect(org.updatedAt).toBeInstanceOf(Timestamp);

    const member = docs.get('organizations/ijac/members/uid-1')!;
    expect(member).toMatchObject({
      uid: 'uid-1',
      email: 'owner@ijac.com.ar',
      organizationId: 'ijac',
      role: 'admin',
      status: 'active',
    });
    expect(member.createdAt).toBeInstanceOf(Timestamp);
    expect(member.updatedAt).toBeInstanceOf(Timestamp);

    expect(docs.get('activeOrganizationMemberships/uid-1')).toMatchObject({
      uid: 'uid-1',
      organizationId: 'ijac',
      status: 'active',
    });
  });

  it('keeps an existing organization document, including its profile', async () => {
    const createdAt = Timestamp.fromMillis(1_700_000_000_000);
    const existing = {
      name: 'IJAC',
      profile: { businessName: 'iJac' },
      createdAt,
      updatedAt: createdAt,
    };
    const { firestore, docs } = createFakeFirestore({ 'organizations/ijac': existing });
    const service = new OrganizationProvisioningService(firestore);

    const result = await service.provision({
      organizationId: 'ijac',
      name: 'Renamed',
      members: [admin],
    });

    expect(result.organizationCreated).toBe(false);
    expect(docs.get('organizations/ijac')).toBe(existing);
  });

  it('updates an existing membership without changing its creation time', async () => {
    const createdAt = Timestamp.fromMillis(1_700_000_000_000);
    const { firestore, docs } = createFakeFirestore({
      'organizations/ijac/members/uid-1': { ...admin, role: 'member', status: 'active', createdAt },
    });
    const service = new OrganizationProvisioningService(firestore);

    const result = await service.provision({
      organizationId: 'ijac',
      name: 'IJAC',
      members: [admin],
    });

    expect(result).toEqual({ organizationCreated: true, membersCreated: 0, membersUpdated: 1 });
    const member = docs.get('organizations/ijac/members/uid-1')!;
    expect(member.role).toBe('admin');
    expect(member.createdAt).toBe(createdAt);
  });

  it('writes nothing in dry-run mode but reports what it would do', async () => {
    const { firestore, docs } = createFakeFirestore();
    const service = new OrganizationProvisioningService(firestore);

    const result = await service.provision(
      { organizationId: 'ijac', name: 'IJAC', members: [admin] },
      { dryRun: true },
    );

    expect(result).toEqual({ organizationCreated: true, membersCreated: 1, membersUpdated: 0 });
    expect(docs.size).toBe(0);
  });
});
