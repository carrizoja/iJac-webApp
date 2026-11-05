import { Inject, Injectable } from '@nestjs/common';
import {
  isValidCuit,
  normalizeTaxId,
  OrganizationProfile,
  OrganizationProfileStatus,
} from '@ijac/shared';
import { ValidationError } from '../common/errors';
import { ORGANIZATION_PROFILE_REPOSITORY } from './organization-profile.constants';
import {
  OrganizationProfileRepository,
  SaveOrganizationProfileInput,
} from './organization-profile.repository';

const REQUIRED_TEXT_FIELDS = ['businessName', 'address', 'phone'] as const;

@Injectable()
export class OrganizationProfileService {
  constructor(
    @Inject(ORGANIZATION_PROFILE_REPOSITORY)
    private readonly repository: OrganizationProfileRepository,
  ) {}

  async get(organizationId: string): Promise<OrganizationProfileStatus> {
    const profile = await this.repository.find(organizationId);
    return profile ? { configured: true, profile } : { configured: false };
  }

  async save(
    organizationId: string,
    input: SaveOrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    const normalized: SaveOrganizationProfileInput = {
      businessName: input.businessName.trim(),
      cuit: normalizeTaxId(input.cuit),
      address: input.address.trim(),
      phone: input.phone.trim(),
      signatoryName: input.signatoryName?.trim() ?? '',
    };

    const fieldErrors: Record<string, string> = {};
    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!normalized[field]) {
        fieldErrors[field] = `${field} should not be empty`;
      }
    }
    if (!isValidCuit(normalized.cuit)) {
      fieldErrors.cuit = 'cuit must be a valid 11-digit CUIT';
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('Invalid organization profile', fieldErrors);
    }

    return this.repository.save(organizationId, normalized);
  }
}
