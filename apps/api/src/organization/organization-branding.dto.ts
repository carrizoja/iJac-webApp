import { IsIn, IsString, MaxLength } from 'class-validator';
import { BRANDING_CONTENT_TYPES, BRANDING_MAX_BYTES, BrandingContentType } from '@ijac/shared';

export class UpdateBrandingImageDto {
  @IsIn(BRANDING_CONTENT_TYPES)
  contentType!: BrandingContentType;

  /** Base64 of at most BRANDING_MAX_BYTES; the service checks the exact size and format. */
  @IsString()
  @MaxLength(Math.ceil(BRANDING_MAX_BYTES / 3) * 4)
  data!: string;
}
