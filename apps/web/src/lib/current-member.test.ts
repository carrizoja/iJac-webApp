import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock('./auth', () => ({ getCurrentToken: vi.fn() }));

import { apiGet } from './api';
import { getCurrentToken } from './auth';
import { getCurrentMember } from './resources';

describe('current member resource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentToken).mockResolvedValue('token');
  });

  it('reads the signed-in member role with the caller token', async () => {
    vi.mocked(apiGet).mockResolvedValue({ data: { role: 'admin' } });

    await expect(getCurrentMember()).resolves.toEqual({ role: 'admin' });
    expect(apiGet).toHaveBeenCalledWith('/me', 'token');
  });
});
