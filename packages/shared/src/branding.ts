/** Organization images printed on receipts. */
export const BRANDING_KINDS = ['logo', 'signature'] as const;
export type BrandingKind = (typeof BRANDING_KINDS)[number];

/** Raster formats only: SVG can carry scripts. */
export const BRANDING_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const;
export type BrandingContentType = (typeof BRANDING_CONTENT_TYPES)[number];

/** Largest accepted image, in decoded bytes. */
export const BRANDING_MAX_BYTES = 200 * 1024;

export interface BrandingImageInput {
  contentType: BrandingContentType;
  /** Base64 image bytes, without a `data:` prefix. */
  data: string;
}

export interface BrandingImage extends BrandingImageInput {
  updatedAt: string;
}

/** `GET /organization/branding/:kind` response; `image` is null when none was uploaded. */
export interface BrandingImageResponse {
  image: BrandingImage | null;
}

export function isBrandingKind(value: string): value is BrandingKind {
  return (BRANDING_KINDS as readonly string[]).includes(value);
}

/** `data:` URL for an `<img src>`. */
export function brandingImageSrc(image: BrandingImageInput): string {
  return `data:${image.contentType};base64,${image.data}`;
}
