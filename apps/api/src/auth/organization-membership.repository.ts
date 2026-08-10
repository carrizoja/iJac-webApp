import { OrganizationMembership } from '@ijac/shared';

export interface OrganizationMembershipRepository {
  findActiveByUid(uid: string): Promise<OrganizationMembership | null>;
  findByUidAndOrganizationId(
    uid: string,
    organizationId: string,
  ): Promise<OrganizationMembership | null>;
}
