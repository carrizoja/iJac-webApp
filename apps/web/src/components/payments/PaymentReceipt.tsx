import {
  PaymentConcept,
  PaymentMethod,
  PaymentStatus,
  amountToSpanishWords,
  formatMoney,
  formatReceiptNumber,
  type Payment,
} from '@ijac/shared';

/**
 * Receipt strings are intentionally fixed in Spanish: the document is handed to
 * clients and must not change with the interface language.
 */
const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.BANK_TRANSFER]: 'Transferencia bancaria',
  [PaymentMethod.MERCADO_PAGO]: 'Mercado Pago',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.OTHER]: 'Otro',
};

const CONCEPT_LABELS: Record<PaymentConcept, string> = {
  [PaymentConcept.ADVANCE]: 'Anticipo',
  [PaymentConcept.BALANCE_SETTLEMENT]: 'Cancelación de saldo',
};

/** Formats an 11-digit CUIT as `XX-XXXXXXXX-X`; anything else is shown as stored. */
function formatCuit(cuit: string): string {
  const digits = cuit.replace(/\D/g, '');
  return digits.length === 11
    ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    : cuit;
}

/** Formats `YYYY-MM-DD` as `dd/mm/yyyy` without going through a timezone-aware Date. */
function formatReceiptDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate;
}

export function PaymentReceipt({ payment }: { payment: Payment }) {
  const receiptNumber = formatReceiptNumber(payment.receiptNumber);
  const voided = payment.status === PaymentStatus.VOIDED;
  const words = amountToSpanishWords(payment.amountMinor, payment.currency);
  const figures = formatMoney(payment.amountMinor, payment.currency);

  return (
    <article
      className="payment-receipt space-y-5 border border-gray-400 bg-white p-8 text-gray-900"
      aria-label={`Recibo N° ${receiptNumber}`}
      lang="es"
      data-testid="payment-receipt"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-400 pb-4">
        <div className="space-y-0.5">
          <p className="text-xl font-bold">{payment.issuer.businessName}</p>
          <p>CUIT: {formatCuit(payment.issuer.cuit)}</p>
          <p>{payment.issuer.address}</p>
          <p>Tel.: {payment.issuer.phone}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-xl font-bold">Recibo N° {receiptNumber}</p>
          <p>Fecha: {formatReceiptDate(payment.paymentDate)}</p>
        </div>
      </header>

      {voided && (
        <div className="border-4 border-red-700 p-3 text-center text-red-700" role="status">
          <p className="text-5xl font-black tracking-widest">ANULADO</p>
          <p>Motivo: {payment.void?.reason}</p>
        </div>
      )}

      <div className="space-y-2 text-base leading-7">
        <p>Recibí de {payment.client.name}</p>
        {payment.client.taxId && <p>CUIT/DNI: {payment.client.taxId}</p>}
        <p>{`la suma de ${words} (${figures})`}</p>
        <p>{`en concepto de: ${CONCEPT_LABELS[payment.concept]} — ${payment.workOrderTitle}`}</p>
        <p>Forma de pago: {METHOD_LABELS[payment.method]}</p>
        {payment.notes && <p>Observaciones: {payment.notes}</p>}
      </div>

      <div className="pt-12">
        <div className="w-64 border-t border-gray-900 pt-1 text-sm">Firma y aclaración</div>
      </div>

      <footer className="border-t border-gray-400 pt-3 text-center text-sm">
        Documento no válido como factura
      </footer>
    </article>
  );
}
