import { OrganizationMemberRole } from '@ijac/shared';
import { MeController } from './me.controller';
import { UserRequest } from './user-request';

describe('MeController', () => {
  const controller = new MeController();
  const admin: UserRequest = {
    uid: 'u1',
    email: 'a@x.test',
    organizationId: 'org-1',
    role: OrganizationMemberRole.ADMIN,
  };

  it('returns the role of the signed-in member', () => {
    expect(controller.get(admin)).toEqual({ role: OrganizationMemberRole.ADMIN });
    expect(controller.get({ ...admin, uid: 'u2', role: OrganizationMemberRole.MEMBER })).toEqual({
      role: OrganizationMemberRole.MEMBER,
    });
  });

  it('returns nothing else about the member', () => {
    expect(Object.keys(controller.get(admin))).toEqual(['role']);
  });
});
