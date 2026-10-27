import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock('./auth', () => ({ getCurrentToken: vi.fn() }));

import { apiGet, apiPut } from './api';
import { getCurrentToken } from './auth';
import { ApiRequestError, getOrganizationProfile, saveOrganizationProfile } from './resources';

const input = { businessName: 'iJac', cuit: '20-12345678-6', address: 'Calle 1', phone: '555' };

describe('organization profile resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentToken).mockResolvedValue('token');
  });

  it('reads the profile status with the caller token', async () => {
    vi.mocked(apiGet).mockResolvedValue({ data: { configured: false, canEdit: true } });

    await expect(getOrganizationProfile()).resolves.toEqual({ configured: false, canEdit: true });
    expect(apiGet).toHaveBeenCalledWith('/organization/profile', 'token');
  });

  it('saves the profile with PUT', async () => {
    vi.mocked(apiPut).mockResolvedValue({ data: { ...input, updatedAt: 'x' } });

    await saveOrganizationProfile(input);

    expect(apiPut).toHaveBeenCalledWith('/organization/profile', input, 'token');
  });

  it('keeps the error code and field errors on failure', async () => {
    vi.mocked(apiPut).mockResolvedValue({
      error: { code: 'VALIDATION_ERROR', message: 'bad', fieldErrors: { cuit: 'invalid' } },
    });

    const error = await saveOrganizationProfile(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      message: 'VALIDATION_ERROR',
      code: 'VALIDATION_ERROR',
      fieldErrors: { cuit: 'invalid' },
    });
  });

  it('requires a signed-in user', async () => {
    vi.mocked(getCurrentToken).mockResolvedValue(null);

    await expect(getOrganizationProfile()).rejects.toThrow('UNAUTHORIZED');
  });
});
