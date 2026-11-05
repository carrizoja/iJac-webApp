import { OrganizationMemberRole } from '@ijac/shared';
import { OrganizationBrandingController } from './organization-branding.controller';
import { OrganizationBrandingService } from './organization-branding.service';
import { UserRequest } from '../auth/user-request';
import { ROLES_KEY } from '../auth/require-role.decorator';

const image = { contentType: 'image/png' as const, data: 'iVBORw0KGgo=', updatedAt: '2026-11-05T10:00:00.000Z' };

describe('OrganizationBrandingController', () => {
  let service: { get: jest.Mock; save: jest.Mock; remove: jest.Mock };
  let controller: OrganizationBrandingController;
  const member: UserRequest = { uid: 'u2', email: 'm@x.test', organizationId: 'org-1', role: 'member' };

  beforeEach(() => {
    service = { get: jest.fn(), save: jest.fn(), remove: jest.fn() };
    controller = new OrganizationBrandingController(
      service as unknown as OrganizationBrandingService,
    );
  });

  it('returns the image of the caller organization', async () => {
    service.get.mockResolvedValue(image);

    await expect(controller.get(member, 'signature')).resolves.toEqual({ image });
    expect(service.get).toHaveBeenCalledWith('org-1', 'signature');
  });

  it('returns a null image when none was uploaded', async () => {
    service.get.mockResolvedValue(null);

    await expect(controller.get(member, 'logo')).resolves.toEqual({ image: null });
  });

  it('saves and removes images for the caller organization', async () => {
    service.save.mockResolvedValue(image);
    const dto = { contentType: 'image/png' as const, data: 'iVBORw0KGgo=' };

    await expect(controller.put(member, 'logo', dto)).resolves.toEqual(image);
    expect(service.save).toHaveBeenCalledWith('org-1', 'logo', dto);

    await controller.remove(member, 'logo');
    expect(service.remove).toHaveBeenCalledWith('org-1', 'logo');
  });

  it('restricts PUT and DELETE to admins and leaves GET open to members', () => {
    const proto = OrganizationBrandingController.prototype;
    expect(Reflect.getMetadata(ROLES_KEY, proto.put)).toEqual([OrganizationMemberRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, proto.remove)).toEqual([OrganizationMemberRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, proto.get)).toBeUndefined();
  });
});
