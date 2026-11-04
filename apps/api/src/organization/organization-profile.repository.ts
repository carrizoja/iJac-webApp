import { OrganizationProfile, OrganizationProfileInput } from '@ijac/shared';

export type SaveOrganizationProfileInput = OrganizationProfileInput;

export interface OrganizationProfileRepository {
  find(organizationId: string): Promise<OrganizationProfile | null>;
  save(organizationId: string, input: SaveOrganizationProfileInput): Promise<OrganizationProfile>;
}
