import { OrganizationProfile } from '@ijac/shared';
import { ValidationError } from '../common/errors';
import { OrganizationProfileService } from './organization-profile.service';
import {
  OrganizationProfileRepository,
  SaveOrganizationProfileInput,
} from './organization-profile.repository';

class InMemoryOrganizationProfileRepository implements OrganizationProfileRepository {
  profiles = new Map<string, OrganizationProfile>();

  async find(organizationId: string): Promise<OrganizationProfile | null> {
    return this.profiles.get(organizationId) ?? null;
  }

  async save(
    organizationId: string,
    input: SaveOrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    const profile = { ...input, updatedAt: '2026-08-07T10:00:00.000Z' };
    this.profiles.set(organizationId, profile);
    return profile;
  }
}

const validInput = {
  businessName: 'iJac IT Solutions',
  cuit: '20-12345678-6',
  address: 'Av. Siempre Viva 123',
  phone: '+54 11 1234-5678',
};

describe('OrganizationProfileService', () => {
  let repository: InMemoryOrganizationProfileRepository;
  let service: OrganizationProfileService;

  beforeEach(() => {
    repository = new InMemoryOrganizationProfileRepository();
    service = new OrganizationProfileService(repository);
  });

  it('reports a profile that was never saved as not configured', async () => {
    await expect(service.get('org-1')).resolves.toEqual({ configured: false });
  });

  it('returns the saved profile as configured', async () => {
    await service.save('org-1', validInput);

    await expect(service.get('org-1')).resolves.toEqual({
      configured: true,
      profile: expect.objectContaining({ businessName: 'iJac IT Solutions' }),
    });
  });

  it('keeps organizations isolated from each other', async () => {
    await service.save('org-1', validInput);

    await expect(service.get('org-2')).resolves.toEqual({ configured: false });
  });

  it('trims fields and stores the CUIT as 11 digits', async () => {
    const profile = await service.save('org-1', {
      businessName: '  iJac IT Solutions  ',
      cuit: ' 20.12345678.6 ',
      address: ' Av. Siempre Viva 123 ',
      phone: ' 555-0100 ',
    });

    expect(profile).toEqual({
      businessName: 'iJac IT Solutions',
      cuit: '20123456786',
      address: 'Av. Siempre Viva 123',
      phone: '555-0100',
      updatedAt: '2026-08-07T10:00:00.000Z',
    });
  });

  it.each(['20123456787', '2012345678', '2012345678a', '---'])(
    'rejects the invalid CUIT %p with a field-level error and stores nothing',
    async (cuit) => {
      const error = await service.save('org-1', { ...validInput, cuit }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors).toEqual({
        cuit: expect.any(String),
      });
      expect(repository.profiles.size).toBe(0);
    },
  );

  it.each(['businessName', 'address', 'phone'] as const)(
    'rejects a blank %s with a field-level error',
    async (field) => {
      const error = await service
        .save('org-1', { ...validInput, [field]: '   ' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors).toEqual({
        [field]: expect.any(String),
      });
      expect(repository.profiles.size).toBe(0);
    },
  );
});
