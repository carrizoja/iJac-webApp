export interface PaymentSummaryItem {
  label: string;
  value: string;
  /** Spans both columns, for values that run long such as an order title. */
  wide?: boolean;
}

interface PaymentSummaryProps {
  items: PaymentSummaryItem[];
  className?: string;
  'data-testid'?: string;
}

/**
 * The facts a payment dialog acts on. Payments cannot be edited, so recording and voiding
 * both say exactly which order, client and amount they affect.
 */
export function PaymentSummary({ items, className = '', ...rest }: PaymentSummaryProps) {
  return (
    <dl
      className={`grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border-default p-3 text-sm ${className}`}
      {...rest}
    >
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'col-span-2' : undefined}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words font-medium tabular-nums text-fg-primary">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
