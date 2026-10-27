import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { setLanguage } from '../../i18n/language';
import { makePayment } from './fixtures';
import { ReceiptPrintView } from './ReceiptPrintView';

describe('ReceiptPrintView', () => {
  beforeEach(() => setLanguage('es'));
  afterEach(() => vi.restoreAllMocks());

  it('shows the receipt in a modal dialog attached to the body', () => {
    render(
      <main data-testid="page">
        <ReceiptPrintView payment={makePayment()} onClose={() => {}} />
      </main>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Recibo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('receipt-print-overlay');
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByTestId('payment-receipt')).toBeInTheDocument();
  });

  it('calls window.print from the print button', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ReceiptPrintView payment={makePayment()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('marks the toolbar and backdrop as hidden when printing, but not the receipt', () => {
    render(<ReceiptPrintView payment={makePayment()} onClose={() => {}} />);

    const toolbar = screen
      .getByRole('button', { name: 'Imprimir' })
      .closest('.receipt-print-hidden');
    expect(toolbar).not.toBeNull();
    expect(screen.getByTestId('receipt-backdrop')).toHaveClass('receipt-print-hidden');
    expect(screen.getByTestId('payment-receipt').closest('.receipt-print-hidden')).toBeNull();
  });

  it('closes from the close button and Escape', () => {
    const onClose = vi.fn();
    render(<ReceiptPrintView payment={makePayment()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('localizes the controls in English while the receipt stays Spanish', () => {
    setLanguage('en');
    render(<ReceiptPrintView payment={makePayment()} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByText('Recibí de Acme Corp')).toBeInTheDocument();
  });
});

describe('receipt print stylesheet', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

  it('hides every other body child and the toolbar when a receipt overlay is open', () => {
    expect(css).toMatch(
      /body:has\(\.receipt-print-overlay\)\s*>\s*:not\(\.receipt-print-overlay\)\s*{[^}]*display:\s*none/,
    );
    expect(css).toMatch(/\.receipt-print-hidden\s*{[^}]*display:\s*none/);
  });
});
