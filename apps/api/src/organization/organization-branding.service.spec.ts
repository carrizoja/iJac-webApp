import { BRANDING_MAX_BYTES, BrandingImage, BrandingKind } from '@ijac/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { OrganizationBrandingService } from './organization-branding.service';
import {
  OrganizationBrandingRepository,
  SaveBrandingImageInput,
} from './organization-branding.repository';

class InMemoryBrandingRepository implements OrganizationBrandingRepository {
  images = new Map<string, BrandingImage>();

  async find(organizationId: string, kind: BrandingKind): Promise<BrandingImage | null> {
    return this.images.get(`${organizationId}/${kind}`) ?? null;
  }

  async save(
    organizationId: string,
    kind: BrandingKind,
    input: SaveBrandingImageInput,
  ): Promise<BrandingImage> {
    const image = {
      contentType: input.contentType,
      data: input.data,
      updatedAt: '2026-11-05T10:00:00.000Z',
    };
    this.images.set(`${organizationId}/${kind}`, image);
    return image;
  }

  async remove(organizationId: string, kind: BrandingKind): Promise<void> {
    this.images.delete(`${organizationId}/${kind}`);
  }
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];

function image(header: number[], totalBytes = 64): string {
  const bytes = Buffer.alloc(totalBytes, 1);
  Buffer.from(header).copy(bytes);
  return bytes.toString('base64');
}

async function validationError(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
}

describe('OrganizationBrandingService', () => {
  let repository: InMemoryBrandingRepository;
  let service: OrganizationBrandingService;

  beforeEach(() => {
    repository = new InMemoryBrandingRepository();
    service = new OrganizationBrandingService(repository);
  });

  it('returns null when no image was uploaded', async () => {
    await expect(service.get('org-1', 'logo')).resolves.toBeNull();
  });

  it.each([
    ['logo', 'image/png', PNG_HEADER],
    ['signature', 'image/jpeg', JPEG_HEADER],
  ] as const)('saves and returns a %s as %s', async (kind, contentType, header) => {
    const data = image(header);

    const saved = await service.save('org-1', kind, { contentType, data });

    expect(saved).toEqual({ contentType, data, updatedAt: expect.any(String) });
    await expect(service.get('org-1', kind)).resolves.toEqual(saved);
    await expect(service.get('org-2', kind)).resolves.toBeNull();
  });

  it('removes an image', async () => {
    await service.save('org-1', 'signature', { contentType: 'image/png', data: image(PNG_HEADER) });

    await service.remove('org-1', 'signature');

    await expect(service.get('org-1', 'signature')).resolves.toBeNull();
  });

  it('rejects an unknown kind as not found', async () => {
    await expect(service.get('org-1', 'banner')).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.save('org-1', 'banner', { contentType: 'image/png', data: image(PNG_HEADER) }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove('org-1', 'banner')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects content types other than PNG and JPEG, including SVG', async () => {
    const error = await validationError(
      service.save('org-1', 'logo', {
        contentType: 'image/svg+xml' as never,
        data: Buffer.from('<svg/>').toString('base64'),
      }),
    );

    expect(error.code).toBe('BRANDING_IMAGE_INVALID');
    expect(error.fieldErrors).toHaveProperty('contentType');
    expect(repository.images.size).toBe(0);
  });

  it('rejects data that is not base64', async () => {
    const error = await validationError(
      service.save('org-1', 'logo', { contentType: 'image/png', data: 'not base64!' }),
    );

    expect(error.code).toBe('BRANDING_IMAGE_INVALID');
    expect(error.fieldErrors).toHaveProperty('data');
  });

  it('rejects bytes that do not match the declared type', async () => {
    const error = await validationError(
      service.save('org-1', 'logo', { contentType: 'image/png', data: image(JPEG_HEADER) }),
    );

    expect(error.code).toBe('BRANDING_IMAGE_INVALID');
    expect(repository.images.size).toBe(0);
  });

  it('accepts an image of exactly the maximum size and rejects one byte more', async () => {
    await expect(
      service.save('org-1', 'logo', {
        contentType: 'image/png',
        data: image(PNG_HEADER, BRANDING_MAX_BYTES),
      }),
    ).resolves.toBeDefined();

    const error = await validationError(
      service.save('org-1', 'signature', {
        contentType: 'image/png',
        data: image(PNG_HEADER, BRANDING_MAX_BYTES + 1),
      }),
    );
    expect(error.code).toBe('BRANDING_IMAGE_TOO_LARGE');
    await expect(service.get('org-1', 'signature')).resolves.toBeNull();
  });
});
