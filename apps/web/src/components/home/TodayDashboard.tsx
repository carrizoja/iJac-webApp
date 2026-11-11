import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  OrganizationMemberRole,
  formatMoney,
  formatReceiptNumber,
  type Currency,
  type Payment,
  type WorkOrderClientSummary,
} from '@ijac/shared';
import { getCurrentMember, getOrganizationProfile, listWorkOrders } from '../../lib/resources';
import { formatMoneyInput } from '../../lib/money';
import { getCalendarConnectionStatus } from '../../lib/calendar';
import { collectAllPages } from '../../lib/collectAllPages';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, localeFor, priorityLabel, statusLabel } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';
import {
  Alert,
  Badge,
  Button,
  LoadingState,
  Panel,
  cn,
  figureClass,
  sectionHeadingClass,
} from '../ui';
import { RecordPaymentDialog } from '../payments/RecordPaymentDialog';
import { ReceiptPrintView } from '../payments/ReceiptPrintView';
import { priorityBadgeClass } from '../work-orders/workOrderBadges';
import { StatusBadge } from '../work-orders/StatusBadge';
import { localDateKey, summarizeToday } from './todaySummary';

const linkClass =
  'rounded font-medium text-fg-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const detailsHref = (id: string) => `/work-orders/details?id=${encodeURIComponent(id)}`;

type OrdersState =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: WorkOrderClientSummary[] };

function Block({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel size="lg" className={className}>
      <section aria-labelledby={id} className="space-y-4">
        <h2 id={id} className={sectionHeadingClass}>
          {title}
        </h2>
        {children}
      </section>
    </Panel>
  );
}

/** Renders the loading and error states shared by every block that reads work orders. */
function OrdersBody({
  state,
  children,
}: {
  state: OrdersState;
  children: (items: WorkOrderClientSummary[]) => ReactNode;
}) {
  const { t } = useLanguage();
  if (state.kind === 'loading') {
    return (
      <LoadingState size="sm" message={t('home.loading')} className="flex-row justify-start" />
    );
  }
  // The failure itself is announced once, above the blocks, with a retry.
  if (state.kind === 'error') {
    return <p className="text-sm text-fg-muted">{t('home.unavailable')}</p>;
  }
  return <>{children(state.items)}</>;
}

function EmptyLine({ messageKey }: { messageKey: TranslationKey }) {
  const { t } = useLanguage();
  return <p className="text-sm text-fg-secondary">{t(messageKey)}</p>;
}

function OrderRow({ order, overdue }: { order: WorkOrderClientSummary; overdue?: boolean }) {
  const { t, language } = useLanguage();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 space-y-0.5">
        <a href={detailsHref(order.id)} className={linkClass}>
          {order.title}
        </a>
        <p className="text-sm text-fg-muted">{order.clientName}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {/* Overdue rows sit under the 'Vencidas' heading, so the date alone turns red. */}
        {order.dueDate && (
          <span
            className={
              overdue
                ? 'font-medium tabular-nums text-destructive-text'
                : 'tabular-nums text-fg-secondary'
            }
          >
            {t('home.dueOn', { date: formatDateOnly(order.dueDate, language) })}
          </span>
        )}
        <StatusBadge status={order.status} size="xs">
          {statusLabel(order.status, language)}
        </StatusBadge>
        <Badge variant="tone" size="xs" className={priorityBadgeClass(order.priority)}>
          {priorityLabel(order.priority, language)}
        </Badge>
      </div>
    </li>
  );
}

/** Hoy shows this many rows per list; the rest wait behind "Ver todas" so Cobros stays in view. */
const LIST_LIMIT = 5;

function OrderGroup({
  title,
  orders,
  overdue,
}: {
  title: string;
  orders: WorkOrderClientSummary[];
  overdue?: boolean;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  if (orders.length === 0) return null;
  const capped = orders.length > LIST_LIMIT;
  const shown = capped && !expanded ? orders.slice(0, LIST_LIMIT) : orders;
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <ul id={listId} className="divide-y divide-border-subtle">
        {shown.map((order) => (
          <OrderRow key={order.id} order={order} overdue={overdue} />
        ))}
      </ul>
      {capped && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
          className={cn(linkClass, 'mt-1 min-h-9 text-sm')}
        >
          {expanded ? t('home.showLess') : t('home.showAll', { count: orders.length })}
        </button>
      )}
    </div>
  );
}

/**
 * The home page: what needs attention today. Every block links to the records behind it;
 * the order blocks share one load, and the calendar line loads on its own.
 */
export function TodayDashboard() {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<OrdersState>({ kind: 'loading' });
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [today] = useState(() => new Date());
  const todayKey = localDateKey(today);
  /** Bumped by "Reintentar" to load the orders again. */
  const [ordersAttempt, setOrdersAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setOrders({ kind: 'loading' });
    collectAllPages((cursor) => listWorkOrders({ cursor }))
      .then((items) => active && setOrders({ kind: 'ready', items }))
      .catch(() => active && setOrders({ kind: 'error' }));
    return () => {
      active = false;
    };
  }, [ordersAttempt]);

  /** Only admins may record payments; until the role is known, nobody is offered it. */
  const [canRecord, setCanRecord] = useState(false);
  /** The owed order whose payment is being recorded. */
  const [paying, setPaying] = useState<WorkOrderClientSummary | null>(null);
  const [recorded, setRecorded] = useState<Payment | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentMember()
      .then((member) => active && setCanRecord(member.role === OrganizationMemberRole.ADMIN))
      .catch(() => active && setCanRecord(false));
    return () => {
      active = false;
    };
  }, []);

  /**
   * Reloads the orders in the background after a refused payment: the balance may have changed
   * elsewhere, so the row, the totals and the open form show what is really owed now.
   */
  const refreshAfterFailure = (workOrderId: string) => {
    collectAllPages((cursor) => listWorkOrders({ cursor }))
      .then((items) => {
        setOrders({ kind: 'ready', items });
        setPaying((current) =>
          current?.id === workOrderId
            ? (items.find((item) => item.id === workOrderId) ?? current)
            : current,
        );
      })
      // The form already shows why it was refused; a failed refresh keeps what is on screen.
      .catch(() => undefined);
  };

  /** Applies a recorded payment to its order, so the row and totals update without a reload. */
  const applyPayment = (payment: Payment) => {
    setOrders((current) =>
      current.kind !== 'ready'
        ? current
        : {
            kind: 'ready',
            items: current.items.map((item) =>
              item.id !== payment.workOrderId
                ? item
                : {
                    ...item,
                    paidMinor: (item.paidMinor ?? 0) + payment.amountMinor,
                    remainingMinor: (item.remainingMinor ?? 0) - payment.amountMinor,
                    hasPayments: true,
                  },
            ),
          },
    );
  };

  /**
   * Payments need the organization profile for their receipts. Checked here so an admin learns
   * it is missing before opening a payment form; a failed check shows nothing, since the form
   * and the server still refuse an incomplete profile.
   */
  const [profileMissing, setProfileMissing] = useState(false);

  useEffect(() => {
    let active = true;
    getOrganizationProfile()
      .then((status) => active && setProfileMissing(!status.configured))
      .catch(() => active && setProfileMissing(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCalendarConnectionStatus()
      .then((status) => active && setCalendarConnected(status.connected))
      .catch(() => active && setCalendarConnected(null));
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () => (orders.kind === 'ready' ? summarizeToday(orders.items, todayKey) : null),
    [orders, todayKey],
  );

  const dateLine = new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  const money = (minor: number, currency: Currency) => formatMoney(minor, currency);

  return (
    <div className="space-y-6">
      <p className="text-fg-secondary first-letter:uppercase">{dateLine}</p>

      {orders.kind === 'error' && (
        <Alert
          type="error"
          action={{ label: t('common.retry'), onClick: () => setOrdersAttempt((n) => n + 1) }}
        >
          {t('home.loadError')}
        </Alert>
      )}

      {recorded && (
        <Alert
          type="success"
          role="status"
          action={{ label: t('payments.viewReceipt'), onClick: () => setReceipt(recorded) }}
          onClose={() => setRecorded(null)}
        >
          {t('payments.recorded', { number: formatReceiptNumber(recorded.receiptNumber) })}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2" data-testid="home-column-main">
          <Block id="home-attention" title={t('home.attention.title')}>
            <OrdersBody state={orders}>
              {() =>
                summary &&
                summary.overdue.length +
                  summary.dueToday.length +
                  summary.urgentUndated.length +
                  summary.upcoming.length >
                  0 ? (
                  <div className="space-y-4">
                    {/* Overdue work is the first thing to act on, so its count leads the block. */}
                    {summary.overdue.length > 0 && (
                      <p data-testid="overdue-count">
                        {/* The count opens the full overdue list, not only the rows shown here. */}
                        <a
                          href="/work-orders?due=overdue"
                          className={cn(
                            linkClass,
                            'inline-flex items-baseline gap-2 font-semibold',
                          )}
                        >
                          <span className="text-3xl tabular-nums text-destructive-text">
                            {summary.overdue.length}
                          </span>{' '}
                          <span>
                            {t(
                              summary.overdue.length === 1
                                ? 'home.attention.overdueCountOne'
                                : 'home.attention.overdueCountOther',
                            )}
                          </span>
                        </a>
                      </p>
                    )}
                    <OrderGroup
                      title={t('home.attention.overdue')}
                      orders={summary.overdue}
                      overdue
                    />
                    <OrderGroup title={t('home.attention.today')} orders={summary.dueToday} />
                    <OrderGroup
                      title={t('home.attention.urgentUndated')}
                      orders={summary.urgentUndated}
                    />
                    <OrderGroup title={t('home.attention.upcoming')} orders={summary.upcoming} />
                  </div>
                ) : (
                  <EmptyLine messageKey="home.attention.empty" />
                )
              }
            </OrdersBody>
            {calendarConnected === false && (
              <p className="text-sm text-fg-secondary">
                <a href="/calendar" className={linkClass}>
                  {t('home.agenda.connect')}
                </a>{' '}
                {t('home.agenda.connectHint')}
              </p>
            )}
            {calendarConnected === true && (
              <p className="text-sm">
                <a href="/calendar" className={linkClass}>
                  {t('home.agenda.openCalendar')}
                </a>
              </p>
            )}
          </Block>
        </div>

        <div className="space-y-6" data-testid="home-column-side">
          <Block id="home-owed" title={t('home.owed.title')}>
            {canRecord && profileMissing && (
              <Alert type="warning" role="status">
                {t('payments.profileMissing')}{' '}
                <a href="/settings" className="font-semibold underline">
                  {t('payments.profileLink')}
                </a>
              </Alert>
            )}
            <OrdersBody state={orders}>
              {() =>
                summary && summary.owed.length > 0 ? (
                  <div className="space-y-4">
                    <dl data-testid="owed-totals">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                        {t('home.owed.total')}
                      </dt>
                      <dd className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        {summary.owedTotals.map((total) => (
                          <span key={total.currency} className={cn(figureClass, 'text-3xl')}>
                            {money(total.remainingMinor, total.currency)}
                          </span>
                        ))}
                      </dd>
                    </dl>
                    <p className="text-sm">
                      <a href="/work-orders?balance=owed" className={linkClass}>
                        {summary.owed.length > LIST_LIMIT
                          ? t('home.owed.viewAllCount', { count: summary.owed.length })
                          : t('home.owed.viewAll')}
                      </a>
                    </p>
                    <ul className="divide-y divide-border-subtle">
                      {summary.owed.slice(0, LIST_LIMIT).map((order) => (
                        <li
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <a href={`${detailsHref(order.id)}#payments`} className={linkClass}>
                              {order.title}
                            </a>
                            <p className="text-sm text-fg-muted">
                              {order.clientName} · {statusLabel(order.status, language)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums text-fg-primary">
                              {money(order.remainingMinor ?? 0, order.currency as Currency)}
                            </span>
                            {canRecord && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                aria-label={t('home.owed.recordNamed', { name: order.title })}
                                onClick={() => {
                                  setRecorded(null);
                                  setPaying(order);
                                }}
                              >
                                {t('payments.record')}
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyLine messageKey="home.owed.empty" />
                )
              }
            </OrdersBody>
          </Block>
          <Block id="home-open" title={t('home.open.title')}>
            <OrdersBody state={orders}>
              {() =>
                summary && (
                  <ul className="space-y-2">
                    <li>
                      <a href="/work-orders?status=open" className={linkClass}>
                        <span className="tabular-nums">{summary.openCount}</span>{' '}
                        {t('home.open.open')}
                      </a>
                    </li>
                    <li>
                      <a href="/work-orders?status=in-progress" className={linkClass}>
                        <span className="tabular-nums">{summary.inProgressCount}</span>{' '}
                        {t('home.open.inProgress')}
                      </a>
                    </li>
                  </ul>
                )
              }
            </OrdersBody>
          </Block>
        </div>
      </div>
      {paying && (
        <RecordPaymentDialog
          isOpen
          onClose={() => setPaying(null)}
          workOrderId={paying.id}
          orderTitle={paying.title}
          clientName={paying.clientName}
          remainingMinor={paying.remainingMinor ?? 0}
          currency={paying.currency as Currency}
          initialAmount={formatMoneyInput(paying.remainingMinor ?? 0)}
          onRecorded={(payment) => {
            applyPayment(payment);
            setRecorded(payment);
          }}
          onFailed={() => refreshAfterFailure(paying.id)}
        />
      )}
      {receipt && <ReceiptPrintView payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
