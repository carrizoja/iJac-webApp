import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { Payment } from '@ijac/shared';
import { useLanguage } from '../../hooks/useLanguage';
import { Button } from '../ui';
import { PaymentReceipt } from './PaymentReceipt';

interface ReceiptPrintViewProps {
  payment: Payment;
  onClose: () => void;
}

/**
 * Full-screen receipt view rendered as a direct child of `<body>` so the print
 * stylesheet can hide every other page region and print only the receipt.
 */
export function ReceiptPrintView({ payment, onClose }: ReceiptPrintViewProps) {
  const { t } = useLanguage();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    overlayRef.current?.querySelector('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('payments.receiptDialog')}
      className="receipt-print-overlay fixed inset-0 z-50 overflow-y-auto"
    >
      <div
        className="receipt-print-hidden fixed inset-0 bg-black/60"
        data-testid="receipt-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-8">
        <div className="receipt-print-hidden flex justify-end gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => window.print()}
            startIcon={<Printer aria-hidden="true" focusable="false" className="h-4 w-4" />}
          >
            {t('payments.print')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            startIcon={<X aria-hidden="true" focusable="false" className="h-4 w-4" />}
          >
            {t('payments.close')}
          </Button>
        </div>
        <div className="receipt-print-area">
          <PaymentReceipt payment={payment} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
