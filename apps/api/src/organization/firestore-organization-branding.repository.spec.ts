import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { ApiEnvironment } from '../config/env';
import { FirestoreOrganizationBrandingRepository } from './firestore-organization-branding.repository';

function setup(mode: 'global' | 'organization') {
  const docRef = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
  const branding = { doc: jest.fn().mockReturnValue(docRef) };
  const orgDoc = { collection: jest.fn().mockReturnValue(branding) };
  const root = { doc: jest.fn().mockReturnValue(orgDoc) };
  const settings = { doc: jest.fn().mockReturnValue(docRef) };
  const collection = jest
    .fn()
    .mockImplementation((name: string) => (name === 'settings' ? settings : root));
  const firestore = { collection } as unknown as Firestore;
  const config = { get: jest.fn().mockReturnValue(mode) } as unknown as ConfigService<ApiEnvironment>;
  return {
    docRef,
    branding,
    orgDoc,
    root,
    settings,
    collection,
    repository: new FirestoreOrganizationBrandingRepository(firestore, config),
  };
}

describe('FirestoreOrganizationBrandingRepository', () => {
  it('stores each image in the organization branding subcollection', async () => {
    const { repository, docRef, root, orgDoc, branding, collection } = setup('organization');

    const saved = await repository.save('org-1', 'signature', {
      contentType: 'image/png',
      data: 'iVBORw0KGgo=',
    });

    expect(collection).toHaveBeenCalledWith('organizations');
    expect(root.doc).toHaveBeenCalledWith('org-1');
    expect(orgDoc.collection).toHaveBeenCalledWith('branding');
    expect(branding.doc).toHaveBeenCalledWith('signature');
    expect(docRef.set).toHaveBeenCalledWith({
      contentType: 'image/png',
      data: 'iVBORw0KGgo=',
      updatedAt: expect.any(Timestamp),
    });
    expect(saved).toEqual({
      contentType: 'image/png',
      data: 'iVBORw0KGgo=',
      updatedAt: expect.any(String),
    });
  });

  it('reads an image and converts its timestamp', async () => {
    const { repository, docRef } = setup('organization');
    docRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        contentType: 'image/jpeg',
        data: '/9j/4A==',
        updatedAt: Timestamp.fromDate(new Date('2026-11-05T10:00:00.000Z')),
      }),
    });

    await expect(repository.find('org-1', 'logo')).resolves.toEqual({
      contentType: 'image/jpeg',
      data: '/9j/4A==',
      updatedAt: '2026-11-05T10:00:00.000Z',
    });
  });

  it('returns null when the image does not exist', async () => {
    const { repository, docRef } = setup('organization');
    docRef.get.mockResolvedValue({ exists: false, data: () => undefined });

    await expect(repository.find('org-1', 'logo')).resolves.toBeNull();
  });

  it('deletes an image', async () => {
    const { repository, docRef, branding } = setup('organization');

    await repository.remove('org-1', 'logo');

    expect(branding.doc).toHaveBeenCalledWith('logo');
    expect(docRef.delete).toHaveBeenCalled();
  });

  it('uses one settings document per kind in global mode', async () => {
    const { repository, docRef, settings, collection } = setup('global');
    docRef.get.mockResolvedValue({ exists: false, data: () => undefined });

    await repository.find('org-1', 'signature');

    expect(collection).toHaveBeenCalledWith('settings');
    expect(settings.doc).toHaveBeenCalledWith('branding-signature');
  });
});
