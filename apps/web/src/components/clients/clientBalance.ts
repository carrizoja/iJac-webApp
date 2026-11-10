import type { Currency, WorkOrderClientSummary } from '@ijac/shared';
import { isOwed } from '../home/todaySummary';

export interface OwedAmount {
  currency: Currency;
  minor: number;
}

/**
 * What each client still owes, per currency, from the orders with money left to collect (the same
 * rule Hoy and the order list use). Clients that owe nothing are left out.
 */
export function owedByClient(orders: WorkOrderClientSummary[]): Map<string, OwedAmount[]> {
  const totals = new Map<string, Map<Currency, number>>();
  for (const order of orders) {
    if (!isOwed(order) || !order.currency) continue;
    const byCurrency = totals.get(order.clientId) ?? new Map<Currency, number>();
    byCurrency.set(
      order.currency,
      (byCurrency.get(order.currency) ?? 0) + (order.remainingMinor ?? 0),
    );
    totals.set(order.clientId, byCurrency);
  }
  return new Map(
    [...totals].map(([clientId, byCurrency]) => [
      clientId,
      [...byCurrency]
        .map(([currency, minor]) => ({ currency, minor }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
    ]),
  );
}
