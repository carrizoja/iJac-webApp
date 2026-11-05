import { BrandingImage, BrandingImageInput, BrandingKind } from '@ijac/shared';

export type SaveBrandingImageInput = BrandingImageInput;

export interface OrganizationBrandingRepository {
  find(organizationId: string, kind: BrandingKind): Promise<BrandingImage | null>;
  save(
    organizationId: string,
    kind: BrandingKind,
    input: SaveBrandingImageInput,
  ): Promise<BrandingImage>;
  remove(organizationId: string, kind: BrandingKind): Promise<void>;
}
