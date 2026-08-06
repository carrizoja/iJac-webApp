import { describe, expect, it } from 'vitest';

import { apiCall } from './api';

describe('apiCall', () => {
  it('returns network error on fetch failure', async () => {
    const result = await apiCall('/test', {}, 'token');
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('NETWORK_ERROR');
  });
});
