import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  Currency,
  PAYMENT_ERROR_CODES,
  PaymentMethod,
  PaymentStatus,
  WorkOrderStatus,
  type WorkOrderPaymentsResponse,
} from '@ijac/shared';
import { setLanguage } from '../../i18n/language';
import { makePayment } from './fixtures';

const { listPayments, recordPayment, voidPayment } = vi.hoisted(() => ({
  listPayments: vi.fn(),
  recordPayment: vi.fn(),
  voidPayment: vi.fn(),
}));

vi.mock('../../lib/resources', () => {
  class ApiRequestError extends Error {
    constructor(
      readonly code: string,
      readonly fieldErrors?: Record<string, string>,
    ) {
      super(code);
    }
  }
  const getBrandingImage = async () => ({ image: null });
  const getOrganizationProfile = async () => ({ configured: false, canEdit: false });
  return {
    ApiRequestError,
    listPayments,
    recordPayment,
    voidPayment,
    getBrandingImage,
    getOrganizationProfile,
  };
});

import { ApiRequestError } from '../../lib/resources';
import { PaymentsPanel } from './PaymentsPanel';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function response(overrides: Partial<WorkOrderPaymentsResponse> = {}): WorkOrderPaymentsResponse {
  return {
    items: [],
    balance: {
      currency: Currency.ARS,
      totalMinor: 10000000,
      paidMinor: 0,
      remainingMinor: 10000000,
    },
    canManage: true,
    ...overrides,
  };
}

function renderPanel(status: WorkOrderStatus = WorkOrderStatus.OPEN) {
  return render(<PaymentsPanel workOrderId="wo-1" workOrderStatus={status} />);
}

async function openRecordDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }));
  return screen.findByRole('alertdialog');
}

describe('PaymentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLanguage('es');
  });

  it('shows the balance summary and payment list', async () => {
    const active = makePayment({ id: 'a', receiptNumber: 1, amountMinor: 3000000 });
    listPayments.mockResolvedValue(
      response({
        items: [active],
        balance: {
          currency: Currency.ARS,
          totalMinor: 10000000,
          paidMinor: 3000000,
          remainingMinor: 7000000,
        },
      }),
    );
    renderPanel();

    expect(await screen.findByText('$ 100.000,00')).toBeInTheDocument();
    expect(screen.getByText('$ 70.000,00')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /0001-00000001/ });
    expect(within(row).getByText('Transferencia bancaria')).toBeInTheDocument();
    expect(within(row).getByText('$ 30.000,00')).toBeInTheDocument();
    expect(within(row).getByText('Vigente')).toBeInTheDocument();
    expect(listPayments).toHaveBeenCalledWith('wo-1');
  });

  it('records a payment as admin and refreshes the balance', async () => {
    const recorded = makePayment({ id: 'new', receiptNumber: 7, amountMinor: 2500000 });
    listPayments.mockResolvedValueOnce(response()).mockResolvedValueOnce(
      response({
        items: [recorded],
        balance: {
          currency: Currency.ARS,
          totalMinor: 10000000,
          paidMinor: 2500000,
          remainingMinor: 7500000,
        },
      }),
    );
    recordPayment.mockResolvedValue(recorded);
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '25.000,00' } });
    fireEvent.change(screen.getByLabelText(/Fecha del pago/), { target: { value: '2026-08-05' } });
    fireEvent.change(screen.getByLabelText(/Forma de pago/), {
      target: { value: PaymentMethod.CASH },
    });
    fireEvent.change(screen.getByLabelText(/Observaciones/), { target: { value: 'Seña' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(recordPayment).toHaveBeenCalledWith('wo-1', {
        amountMinor: 2500000,
        paymentDate: '2026-08-05',
        method: PaymentMethod.CASH,
        notes: 'Seña',
        idempotencyKey: expect.stringMatching(UUID_PATTERN),
      }),
    );
    expect(await screen.findByText('$ 75.000,00')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /0001-00000007/ })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('defaults the payment date to today', async () => {
    listPayments.mockResolvedValue(response());
    renderPanel();

    await openRecordDialog();

    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(screen.getByLabelText(/Fecha del pago/)).toHaveValue(today);
  });

  it('blocks an amount above the remaining balance on the client', async () => {
    listPayments.mockResolvedValue(response());
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '100.000,01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('El importe supera el saldo pendiente ($ 100.000,00)'),
    ).toBeInTheDocument();
    expect(recordPayment).not.toHaveBeenCalled();
  });

  it('rejects a blank or malformed amount', async () => {
    listPayments.mockResolvedValue(response());
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Ingresá un importe válido mayor a cero')).toBeInTheDocument();
    expect(recordPayment).not.toHaveBeenCalled();
  });

  it('shows the overpayment error returned by the server and refreshes the balance', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(
      new ApiRequestError(PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE, {
        amountMinor: 'amount exceeds the remaining balance of 5000',
      }),
    );
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '50.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('El importe supera el saldo pendiente ($ 100.000,00)'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(listPayments).toHaveBeenCalledTimes(2);
  });

  it('links to Settings when the organization profile is not configured', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(
      new ApiRequestError(PAYMENT_ERROR_CODES.ORGANIZATION_PROFILE_NOT_CONFIGURED),
    );
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('Completá los datos de la organización antes de registrar pagos.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Configuración' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('shows an invalid-amount message, not the overpayment one, for other amount errors', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', { amountMinor: 'amountMinor must be an integer' }),
    );
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Ingresá un importe válido mayor a cero')).toBeInTheDocument();
    expect(screen.queryByText(/supera el saldo/)).not.toBeInTheDocument();
  });

  it('shows the invalid-amount message in English too', async () => {
    setLanguage('en');
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', { amountMinor: 'amountMinor must be an integer' }),
    );
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    await screen.findByRole('alertdialog');
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));

    expect(await screen.findByText('Enter a valid amount greater than zero')).toBeInTheDocument();
  });

  it('maps the unpriced and cancelled codes to their hints', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValueOnce(
      new ApiRequestError(PAYMENT_ERROR_CODES.WORK_ORDER_NOT_PRICED),
    );
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(
      (await screen.findAllByText('Definí un precio total en la orden antes de registrar pagos.'))
        .length,
    ).toBeGreaterThan(0);

    recordPayment.mockRejectedValueOnce(
      new ApiRequestError(PAYMENT_ERROR_CODES.WORK_ORDER_CANCELLED),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(
      (await screen.findAllByText('La orden está cancelada: no se pueden registrar nuevos pagos.'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('does not rely on message text: a plain CONFLICT shows the generic error', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(new ApiRequestError('CONFLICT'));
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('No se pudo registrar el pago.')).toBeInTheDocument();
  });

  it('reuses the idempotency key when resubmitting after a network failure', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(makePayment());
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await screen.findByText('No se pudo registrar el pago.');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(recordPayment).toHaveBeenCalledTimes(2));

    const [first, second] = recordPayment.mock.calls.map(([, body]) => body.idempotencyKey);
    expect(first).toMatch(UUID_PATTERN);
    expect(second).toBe(first);
  });

  it('generates a new idempotency key for each new form', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockResolvedValue(makePayment());
    renderPanel();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await openRecordDialog();
      fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
      fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
      await waitFor(() => expect(recordPayment).toHaveBeenCalledTimes(attempt + 1));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    }

    const [first, second] = recordPayment.mock.calls.map(([, body]) => body.idempotencyKey);
    expect(second).not.toBe(first);
  });

  it('uses a fresh key after the server reports an idempotency conflict', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment
      .mockRejectedValueOnce(new ApiRequestError(PAYMENT_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT))
      .mockResolvedValueOnce(makePayment());
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await screen.findByText('No se pudo registrar el pago.');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(recordPayment).toHaveBeenCalledTimes(2));

    const [first, second] = recordPayment.mock.calls.map(([, body]) => body.idempotencyKey);
    expect(second).not.toBe(first);
  });

  it('shows a generic error with unmapped server messages', async () => {
    listPayments.mockResolvedValue(response());
    recordPayment.mockRejectedValue(
      new ApiRequestError('VALIDATION_ERROR', { notes: 'notes too long' }),
    );
    renderPanel();

    await openRecordDialog();
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1.000,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('No se pudo registrar el pago. notes too long'),
    ).toBeInTheDocument();
  });

  it('hides record and void actions from members but keeps receipts', async () => {
    listPayments.mockResolvedValue(response({ canManage: false, items: [makePayment()] }));
    renderPanel();

    expect(await screen.findByRole('row', { name: /0001-00000042/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver recibo 0001-00000042' })).toBeInTheDocument();
  });

  it('asks for a total price when the work order is unpriced', async () => {
    listPayments.mockResolvedValue(response({ balance: null }));
    renderPanel();

    expect(
      await screen.findByText('Definí un precio total en la orden antes de registrar pagos.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('explains why a cancelled work order cannot take payments', async () => {
    listPayments.mockResolvedValue(response());
    renderPanel(WorkOrderStatus.CANCELLED);

    expect(
      await screen.findByText('La orden está cancelada: no se pueden registrar nuevos pagos.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
  });

  it('keeps void available on a cancelled work order', async () => {
    listPayments.mockResolvedValue(response({ items: [makePayment()] }));
    renderPanel(WorkOrderStatus.CANCELLED);

    expect(
      await screen.findByRole('button', { name: 'Anular recibo 0001-00000042' }),
    ).toBeInTheDocument();
  });

  it('requires a reason to void and sends the trimmed reason', async () => {
    const payment = makePayment();
    listPayments.mockResolvedValue(response({ items: [payment] }));
    voidPayment.mockResolvedValue({ ...payment, status: PaymentStatus.VOIDED });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Anular recibo 0001-00000042' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Anular pago' }));

    expect(await screen.findByText('Ingresá el motivo de la anulación')).toBeInTheDocument();
    expect(voidPayment).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Motivo de la anulación/), {
      target: { value: '  Monto cargado por error  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anular pago' }));

    await waitFor(() =>
      expect(voidPayment).toHaveBeenCalledWith('wo-1', 'pay-1', {
        reason: 'Monto cargado por error',
      }),
    );
    await waitFor(() => expect(listPayments).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows a voided payment with its reason and no void action', async () => {
    listPayments.mockResolvedValue(
      response({
        items: [
          makePayment({
            status: PaymentStatus.VOIDED,
            void: {
              reason: 'Monto cargado por error',
              voidedBy: { uid: 'u1', email: null, displayName: null },
              voidedAt: '2026-08-06T10:00:00.000Z',
            },
          }),
        ],
      }),
    );
    renderPanel();

    const row = await screen.findByRole('row', { name: /0001-00000042/ });
    expect(within(row).getByText('Anulado')).toBeInTheDocument();
    expect(
      within(row).getByText('Motivo de anulación: Monto cargado por error'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular recibo/ })).not.toBeInTheDocument();
  });

  it('opens the receipt print view for a payment', async () => {
    listPayments.mockResolvedValue(response({ canManage: false, items: [makePayment()] }));
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver recibo 0001-00000042' }));

    expect(await screen.findByRole('dialog', { name: 'Recibo' })).toBeInTheDocument();
    expect(screen.getByText('Recibí de Acme Corp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Recibo' })).not.toBeInTheDocument();
  });

  it('reports a load failure', async () => {
    listPayments.mockRejectedValue(new Error('boom'));
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los pagos.');
  });

  it('renders in English', async () => {
    setLanguage('en');
    listPayments.mockResolvedValue(response({ items: [makePayment()] }));
    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record payment' })).toBeInTheDocument();
    expect(screen.getByText('Bank transfer')).toBeInTheDocument();
  });
});
