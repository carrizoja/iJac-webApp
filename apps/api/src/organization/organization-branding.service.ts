import { Inject, Injectable } from '@nestjs/common';
import {
  BRANDING_CONTENT_TYPES,
  BRANDING_MAX_BYTES,
  BrandingContentType,
  BrandingImage,
  BrandingImageInput,
  BrandingKind,
  isBrandingKind,
} from '@ijac/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { ORGANIZATION_BRANDING_REPOSITORY } from './organization-profile.constants';
import { OrganizationBrandingRepository } from './organization-branding.repository';

/** Leading bytes each accepted format must start with. */
const SIGNATURES: Record<BrandingContentType, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
};

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** Logo and signature images that receipts print for an organization. */
@Injectable()
export class OrganizationBrandingService {
  constructor(
    @Inject(ORGANIZATION_BRANDING_REPOSITORY)
    private readonly repository: OrganizationBrandingRepository,
  ) {}

  async get(organizationId: string, kind: string): Promise<BrandingImage | null> {
    return this.repository.find(organizationId, this.kind(kind));
  }

  async save(
    organizationId: string,
    kind: string,
    input: BrandingImageInput,
  ): Promise<BrandingImage> {
    const brandingKind = this.kind(kind);
    this.validate(input);
    return this.repository.save(organizationId, brandingKind, {
      contentType: input.contentType,
      data: input.data,
    });
  }

  async remove(organizationId: string, kind: string): Promise<void> {
    await this.repository.remove(organizationId, this.kind(kind));
  }

  private kind(kind: string): BrandingKind {
    if (!isBrandingKind(kind)) {
      throw new NotFoundError('Branding image');
    }
    return kind;
  }

  private validate(input: BrandingImageInput): void {
    if (!(BRANDING_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
      throw new ValidationError(
        'Invalid branding image',
        { contentType: 'contentType must be image/png or image/jpeg' },
        'BRANDING_IMAGE_INVALID',
      );
    }
    if (typeof input.data !== 'string' || input.data.length === 0 || !BASE64.test(input.data)) {
      throw new ValidationError(
        'Invalid branding image',
        { data: 'data must be base64-encoded image bytes' },
        'BRANDING_IMAGE_INVALID',
      );
    }

    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length > BRANDING_MAX_BYTES) {
      throw new ValidationError(
        'Branding image is too large',
        { data: `image must be at most ${BRANDING_MAX_BYTES / 1024} KB` },
        'BRANDING_IMAGE_TOO_LARGE',
      );
    }
    const signature = SIGNATURES[input.contentType];
    if (!signature.every((byte, index) => bytes[index] === byte)) {
      throw new ValidationError(
        'Invalid branding image',
        { data: `data is not a valid ${input.contentType} image` },
        'BRANDING_IMAGE_INVALID',
      );
    }
  }
}
