import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock('./auth', () => ({ getCurrentToken: vi.fn() }));

import { PaymentMethod } from '@ijac/shared';
import { apiGet, apiPost } from './api';
import { getCurrentToken } from './auth';
import { ApiRequestError, listPayments, recordPayment, voidPayment } from './resources';

const input = { amountMinor: 5000, paymentDate: '2026-08-01', method: PaymentMethod.CASH };

describe('payment resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentToken).mockResolvedValue('token');
  });

  it('lists payments of an encoded work order id', async () => {
    vi.mocked(apiGet).mockResolvedValue({ data: { items: [], balance: null, canManage: false } });

    await listPayments('a/b');

    expect(apiGet).toHaveBeenCalledWith('/work-orders/a%2Fb/payments', 'token');
  });

  it('records a payment with POST', async () => {
    vi.mocked(apiPost).mockResolvedValue({ data: { id: 'p1' } });

    await recordPayment('wo1', input);

    expect(apiPost).toHaveBeenCalledWith('/work-orders/wo1/payments', input, 'token');
  });

  it('voids a payment with a reason', async () => {
    vi.mocked(apiPost).mockResolvedValue({ data: { id: 'p1' } });

    await voidPayment('wo1', 'p1', { reason: 'typo' });

    expect(apiPost).toHaveBeenCalledWith(
      '/work-orders/wo1/payments/p1/void',
      { reason: 'typo' },
      'token',
    );
  });

  it('keeps the server error code on failure', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      error: { code: 'CONFLICT', message: 'Complete the organization profile first' },
    });

    const error = await recordPayment('wo1', input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ code: 'CONFLICT' });
    expect(error).not.toHaveProperty('detail');
  });
});
