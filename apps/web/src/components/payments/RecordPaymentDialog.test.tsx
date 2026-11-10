import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Currency } from '@ijac/shared';
import { setLanguage } from '../../i18n/language';
import { makePayment } from './fixtures';

const mocks = vi.hoisted(() => ({
  recordPayment: vi.fn(),
  getOrganizationProfile: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  recordPayment: mocks.recordPayment,
  getOrganizationProfile: mocks.getOrganizationProfile,
}));

import { RecordPaymentDialog } from './RecordPaymentDialog';

const configured = {
  configured: true,
  canEdit: true,
  profile: {
    businessName: 'iJac',
    cuit: '20123456789',
    address: 'Calle 1',
    phone: '123',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
};

function renderDialog(initialAmount = '') {
  return render(
    <RecordPaymentDialog
      isOpen
      onClose={vi.fn()}
      workOrderId="wo-1"
      orderTitle="Cambio de pantalla"
      clientName="Acme"
      remainingMinor={4500000}
      currency={Currency.ARS}
      initialAmount={initialAmount}
      onRecorded={vi.fn()}
    />,
  );
}

describe('RecordPaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLanguage('es');
    mocks.getOrganizationProfile.mockResolvedValue(configured);
  });

  it('names the order, the client and what is still owed', async () => {
    renderDialog();
    const summary = within(await screen.findByTestId('record-payment-summary'));
    expect(summary.getByText('Orden')).toBeInTheDocument();
    expect(summary.getByText('Cambio de pantalla')).toBeInTheDocument();
    expect(summary.getByText('Cliente')).toBeInTheDocument();
    expect(summary.getByText('Acme')).toBeInTheDocument();
    expect(summary.getByText('Saldo')).toBeInTheDocument();
    expect(summary.getByText('$ 45.000,00')).toBeInTheDocument();
  });

  it('says before saving that a recorded payment can only be voided', async () => {
    renderDialog();
    expect(
      await screen.findByText(
        'Un pago registrado no se puede editar ni borrar: si hay un error, se anula.',
      ),
    ).toBeInTheDocument();
  });

  it('puts the amount being recorded on the submit button', async () => {
    renderDialog('45.000');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Registrar $ 45.000,00' })).toBeEnabled();

    fireEvent.change(within(dialog).getByLabelText(/Importe/), { target: { value: '' } });
    expect(within(dialog).getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('warns before the form is filled when the organization profile is missing', async () => {
    mocks.getOrganizationProfile.mockResolvedValue({ configured: false, canEdit: true });
    renderDialog('45.000');
    const dialog = await screen.findByRole('dialog');

    expect(
      await within(dialog).findByText(
        'Completá los datos de la organización antes de registrar pagos.',
      ),
    ).toBeInTheDocument();
    const settings = within(dialog).getByRole('link', { name: 'Ir a Configuración' });
    expect(settings).toHaveAttribute('href', '/settings');
    // Same weight as the matching link on Hoy, so the warning reads the same in both places.
    expect(settings).toHaveClass('font-semibold', 'underline');
    const submit = within(dialog).getByRole('button', { name: 'Registrar $ 45.000,00' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it('still records when the profile cannot be checked', async () => {
    mocks.getOrganizationProfile.mockRejectedValue(new Error('offline'));
    mocks.recordPayment.mockResolvedValue(makePayment({ amountMinor: 4500000 }));
    renderDialog('45.000');
    const dialog = await screen.findByRole('dialog');

    await waitFor(() => expect(mocks.getOrganizationProfile).toHaveBeenCalled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar $ 45.000,00' }));
    await waitFor(() =>
      expect(mocks.recordPayment).toHaveBeenCalledWith(
        'wo-1',
        expect.objectContaining({ amountMinor: 4500000 }),
      ),
    );
  });
});
