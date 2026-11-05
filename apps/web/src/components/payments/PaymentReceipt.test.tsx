import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Currency, PaymentConcept, PaymentMethod, PaymentStatus } from '@ijac/shared';
import { setLanguage } from '../../i18n/language';
import { makePayment } from './fixtures';
import { PaymentReceipt } from './PaymentReceipt';

describe('PaymentReceipt', () => {
  beforeEach(() => setLanguage('es'));

  it('shows the logo in the header and the signature above the signature line', () => {
    render(
      <PaymentReceipt
        payment={makePayment()}
        logoSrc="data:image/png;base64,TE9HTw=="
        signatureSrc="data:image/png;base64,U0lHTg=="
      />,
    );

    const receipt = screen.getByTestId('payment-receipt');
    const logo = within(receipt).getByRole('img', { name: 'Logo de iJac IT Solutions' });
    expect(logo).toHaveAttribute('src', 'data:image/png;base64,TE9HTw==');
    expect(logo.closest('header')).not.toBeNull();
    const signature = within(receipt).getByRole('img', { name: 'Firma' });
    expect(signature).toHaveAttribute('src', 'data:image/png;base64,U0lHTg==');
    expect(screen.getByTestId('receipt-signature')).toContainElement(signature);
    expect(screen.getByTestId('receipt-signature')).toHaveTextContent('Firma y aclaración');
  });

  it('shows no images when the organization has no logo or signature', () => {
    render(<PaymentReceipt payment={makePayment()} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('receipt-signature')).toHaveTextContent('Firma y aclaración');
  });

  it('shows a client DNI as stored, without CUIT hyphens', () => {
    const base = makePayment();
    render(<PaymentReceipt payment={{ ...base, client: { ...base.client, taxId: '12345678' } }} />);

    expect(screen.getByText('CUIT/DNI: 12345678')).toBeInTheDocument();
  });

  it('renders every receipt field from the payment snapshots', () => {
    render(<PaymentReceipt payment={makePayment({ notes: 'Pago parcial' })} />);

    const receipt = screen.getByRole('article', { name: 'Recibo N° 0001-00000042' });
    expect(within(receipt).getByText('iJac IT Solutions')).toBeInTheDocument();
    expect(within(receipt).getByText('CUIT: 20-12345678-6')).toBeInTheDocument();
    expect(within(receipt).getByText('Calle Falsa 123, Córdoba')).toBeInTheDocument();
    expect(within(receipt).getByText('Tel.: +54 351 555-0100')).toBeInTheDocument();
    expect(within(receipt).getByText('Fecha: 05/08/2026')).toBeInTheDocument();
    expect(within(receipt).getByText('Recibí de Acme Corp')).toBeInTheDocument();
    expect(within(receipt).getByText('CUIT/DNI: 30-71234567-8')).toBeInTheDocument();
    expect(
      within(receipt).getByText('la suma de pesos ciento cincuenta mil con 00/100 ($ 150.000,00)'),
    ).toBeInTheDocument();
    expect(
      within(receipt).getByText('en concepto de: Anticipo — Revisión remota'),
    ).toBeInTheDocument();
    expect(within(receipt).getByText('Forma de pago: Transferencia bancaria')).toBeInTheDocument();
    expect(within(receipt).getByText('Observaciones: Pago parcial')).toBeInTheDocument();
    expect(within(receipt).getByText('Firma y aclaración')).toBeInTheDocument();
    expect(within(receipt).getByText('Documento no válido como factura')).toBeInTheDocument();
    expect(within(receipt).queryByText('ANULADO')).not.toBeInTheDocument();
  });

  it('states USD amounts with cents in words', () => {
    render(
      <PaymentReceipt payment={makePayment({ amountMinor: 125050, currency: Currency.USD })} />,
    );

    expect(
      screen.getByText(
        /la suma de dólares estadounidenses mil doscientos cincuenta con 50\/100 \(US\$ 1\.250,50\)/,
      ),
    ).toBeInTheDocument();
  });

  it('omits the tax id line and the notes when absent', () => {
    render(<PaymentReceipt payment={makePayment({ client: { name: 'Acme Corp' } })} />);

    expect(screen.getByText('Recibí de Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText(/CUIT\/DNI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Observaciones/)).not.toBeInTheDocument();
  });

  it('uses the settlement concept and every method label', () => {
    const { rerender } = render(
      <PaymentReceipt payment={makePayment({ concept: PaymentConcept.BALANCE_SETTLEMENT })} />,
    );
    expect(
      screen.getByText('en concepto de: Cancelación de saldo — Revisión remota'),
    ).toBeInTheDocument();

    const labels: Array<[PaymentMethod, string]> = [
      [PaymentMethod.CASH, 'Efectivo'],
      [PaymentMethod.BANK_TRANSFER, 'Transferencia bancaria'],
      [PaymentMethod.MERCADO_PAGO, 'Mercado Pago'],
      [PaymentMethod.CHECK, 'Cheque'],
      [PaymentMethod.OTHER, 'Otro'],
    ];
    for (const [method, label] of labels) {
      rerender(<PaymentReceipt payment={makePayment({ method })} />);
      expect(screen.getByText(`Forma de pago: ${label}`)).toBeInTheDocument();
    }
  });

  it('stays in Spanish when the interface language is English', () => {
    setLanguage('en');
    render(<PaymentReceipt payment={makePayment()} />);

    expect(screen.getByText('Recibí de Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Documento no válido como factura')).toBeInTheDocument();
    expect(screen.getByText('Fecha: 05/08/2026')).toBeInTheDocument();
  });

  it('marks a voided receipt with ANULADO and the reason', () => {
    render(
      <PaymentReceipt
        payment={makePayment({
          status: PaymentStatus.VOIDED,
          void: {
            reason: 'Monto cargado por error',
            voidedBy: { uid: 'u1', email: null, displayName: null },
            voidedAt: '2026-08-06T10:00:00.000Z',
          },
        })}
      />,
    );

    expect(screen.getByText('ANULADO')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Monto cargado por error')).toBeInTheDocument();
    expect(screen.getByText('Recibí de Acme Corp')).toBeInTheDocument();
  });
});
