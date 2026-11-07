import { WorkOrderStatus, type Currency, type WorkOrderClientSummary } from '@ijac/shared';

/** Days after today that count as "coming up" in the attention list. */
export const UPCOMING_DAYS = 7;

export interface OwedTotal {
  currency: Currency;
  remainingMinor: number;
}

export interface TodaySummary {
  /** Pending orders past their due date, oldest first. */
  overdue: WorkOrderClientSummary[];
  /** Pending orders due in the next {@link UPCOMING_DAYS} days, not counting today. */
  upcoming: WorkOrderClientSummary[];
  /** Pending orders due today. */
  dueToday: WorkOrderClientSummary[];
  /** Non-cancelled orders with money still owed, largest balance first. */
  owed: WorkOrderClientSummary[];
  /** Amount owed per currency; currencies are never added together. */
  owedTotals: OwedTotal[];
  openCount: number;
  inProgressCount: number;
}

/** `YYYY-MM-DD` of the given moment in the browser's own time zone. */
export function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

type Dated = Pick<WorkOrderClientSummary, 'status' | 'dueDate'>;

const isPending = (order: Dated) =>
  order.status === WorkOrderStatus.OPEN || order.status === WorkOrderStatus.IN_PROGRESS;

/** Due dates are calendar dates; only their `YYYY-MM-DD` part is compared. */
const dueKey = (order: Dated) => order.dueDate?.slice(0, 10);

/** A pending order whose due date is before `todayKey` (`YYYY-MM-DD`). */
export function isOverdue(order: Dated, todayKey: string): boolean {
  const due = dueKey(order);
  return isPending(order) && due !== undefined && due < todayKey;
}

const byDueDate = (a: WorkOrderClientSummary, b: WorkOrderClientSummary) =>
  (dueKey(a) ?? '').localeCompare(dueKey(b) ?? '');

export function summarizeToday(
  orders: readonly WorkOrderClientSummary[],
  todayKey: string,
): TodaySummary {
  const lastUpcoming = addDays(todayKey, UPCOMING_DAYS);
  const dated = orders.filter((order) => isPending(order) && dueKey(order));

  const owed = orders
    .filter(
      (order) =>
        order.status !== WorkOrderStatus.CANCELLED &&
        order.currency !== undefined &&
        (order.remainingMinor ?? 0) > 0,
    )
    .sort((a, b) => (b.remainingMinor ?? 0) - (a.remainingMinor ?? 0));

  const totals = new Map<Currency, number>();
  for (const order of owed) {
    const currency = order.currency as Currency;
    totals.set(currency, (totals.get(currency) ?? 0) + (order.remainingMinor ?? 0));
  }

  return {
    overdue: dated.filter((order) => isOverdue(order, todayKey)).sort(byDueDate),
    upcoming: dated
      .filter((order) => dueKey(order)! > todayKey && dueKey(order)! <= lastUpcoming)
      .sort(byDueDate),
    dueToday: dated.filter((order) => dueKey(order) === todayKey),
    owed,
    owedTotals: Array.from(totals, ([currency, remainingMinor]) => ({
      currency,
      remainingMinor,
    })).sort((a, b) => a.currency.localeCompare(b.currency)),
    openCount: orders.filter((order) => order.status === WorkOrderStatus.OPEN).length,
    inProgressCount: orders.filter((order) => order.status === WorkOrderStatus.IN_PROGRESS).length,
  };
}
