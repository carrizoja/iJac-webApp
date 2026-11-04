import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { ApiEnvironment } from '../config/env';
import { FirestoreOrganizationProfileRepository } from './firestore-organization-profile.repository';

function setup(mode: 'global' | 'organization') {
  const docRef = { get: jest.fn(), set: jest.fn() };
  const orgCollection = { doc: jest.fn().mockReturnValue(docRef) };
  const collection = jest.fn().mockReturnValue(orgCollection);
  const firestore = { collection } as unknown as Firestore;
  const config = {
    get: jest.fn().mockReturnValue(mode),
  } as unknown as ConfigService<ApiEnvironment>;
  return {
    docRef,
    orgCollection,
    collection,
    repository: new FirestoreOrganizationProfileRepository(firestore, config),
  };
}

const input = {
  businessName: 'iJac',
  cuit: '20123456786',
  address: 'Calle 1',
  phone: '555',
};

describe('FirestoreOrganizationProfileRepository', () => {
  it('reads the profile field of the organization document in organization mode', async () => {
    const { repository, docRef, collection, orgCollection } = setup('organization');
    docRef.get.mockResolvedValue({
      exists: true,
      get: (field: string) =>
        field === 'profile'
          ? {
              ...input,
              updatedAt: Timestamp.fromDate(new Date('2026-08-07T10:00:00.000Z')),
            }
          : undefined,
    });

    const profile = await repository.find('org-1');

    expect(collection).toHaveBeenCalledWith('organizations');
    expect(orgCollection.doc).toHaveBeenCalledWith('org-1');
    expect(profile).toEqual({ ...input, updatedAt: '2026-08-07T10:00:00.000Z' });
  });

  it('reads the single settings document in global mode', async () => {
    const { repository, docRef, collection, orgCollection } = setup('global');
    docRef.get.mockResolvedValue({ exists: false, get: () => undefined });

    const profile = await repository.find('org-1');

    expect(collection).toHaveBeenCalledWith('settings');
    expect(orgCollection.doc).toHaveBeenCalledWith('organization');
    expect(profile).toBeNull();
  });

  it('returns null when the organization has no profile field yet', async () => {
    const { repository, docRef } = setup('organization');
    docRef.get.mockResolvedValue({ exists: true, get: () => undefined });

    await expect(repository.find('org-1')).resolves.toBeNull();
  });

  it('merges the profile field without replacing the organization document', async () => {
    const { repository, docRef } = setup('organization');
    docRef.get.mockResolvedValue({
      exists: true,
      get: () => ({ ...input, updatedAt: Timestamp.now() }),
    });

    await repository.save('org-1', input);

    expect(docRef.set).toHaveBeenCalledWith(
      { profile: { ...input, updatedAt: expect.any(Timestamp) } },
      { merge: true },
    );
  });
});
