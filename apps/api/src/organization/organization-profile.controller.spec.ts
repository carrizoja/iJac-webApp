import { OrganizationMemberRole } from '@ijac/shared';
import { OrganizationProfileController } from './organization-profile.controller';
import { OrganizationProfileService } from './organization-profile.service';
import { UserRequest } from '../auth/user-request';
import { ROLES_KEY } from '../auth/require-role.decorator';

const profile = {
  businessName: 'iJac',
  cuit: '20123456786',
  address: 'Calle 1',
  phone: '555',
  updatedAt: '2026-08-07T10:00:00.000Z',
};

describe('OrganizationProfileController', () => {
  let service: { get: jest.Mock; save: jest.Mock };
  let controller: OrganizationProfileController;
  const admin: UserRequest = {
    uid: 'u1',
    email: 'a@x.test',
    organizationId: 'org-1',
    role: 'admin',
  };
  const member: UserRequest = { ...admin, uid: 'u2', role: 'member' };

  beforeEach(() => {
    service = { get: jest.fn(), save: jest.fn() };
    controller = new OrganizationProfileController(
      service as unknown as OrganizationProfileService,
    );
  });

  it('returns the profile with edit permission for an admin', async () => {
    service.get.mockResolvedValue({ configured: true, profile });

    await expect(controller.get(admin)).resolves.toEqual({
      configured: true,
      profile,
      canEdit: true,
    });
    expect(service.get).toHaveBeenCalledWith('org-1');
  });

  it('returns the profile without edit permission for a member', async () => {
    service.get.mockResolvedValue({ configured: true, profile });

    await expect(controller.get(member)).resolves.toEqual({
      configured: true,
      profile,
      canEdit: false,
    });
  });

  it('answers not configured without failing', async () => {
    service.get.mockResolvedValue({ configured: false });

    await expect(controller.get(member)).resolves.toEqual({
      configured: false,
      canEdit: false,
    });
  });

  it('saves the profile for the caller organization', async () => {
    service.save.mockResolvedValue(profile);
    const dto = {
      businessName: 'iJac',
      cuit: '20-12345678-6',
      address: 'Calle 1',
      phone: '555',
    };

    await expect(controller.put(admin, dto)).resolves.toEqual(profile);
    expect(service.save).toHaveBeenCalledWith('org-1', dto);
  });

  it('restricts PUT to admins and leaves GET open to members', () => {
    expect(Reflect.getMetadata(ROLES_KEY, OrganizationProfileController.prototype.put)).toEqual([
      OrganizationMemberRole.ADMIN,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, OrganizationProfileController.prototype.get),
    ).toBeUndefined();
  });
});
