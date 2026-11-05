import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Express defaults to 100 KB, which is too small for a base64 branding image
 * (BRANDING_MAX_BYTES of image is about 270 KB as base64).
 */
export const JSON_BODY_LIMIT = '512kb';

export function configureBodyParser(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
