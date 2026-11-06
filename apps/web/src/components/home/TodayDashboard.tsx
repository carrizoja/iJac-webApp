import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatMoney, type Currency, type WorkOrderClientSummary } from '@ijac/shared';
import { listWorkOrders } from '../../lib/resources';
import { getCalendarConnectionStatus } from '../../lib/calendar';
import { collectAllPages } from '../../lib/collectAllPages';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, localeFor, priorityLabel, statusLabel } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';
import { Badge, LoadingState, Panel } from '../ui';
import { priorityBadgeClass, statusBadgeClass } from '../work-orders/workOrderBadges';
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
        <h2 id={id} className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
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
  if (state.kind === 'error') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('home.loadError')}
      </p>
    );
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
        {overdue && (
          <Badge variant="error" size="xs">
            {t('home.overdueBadge')}
          </Badge>
        )}
        <span className="tabular-nums text-fg-secondary">
          {t('home.dueOn', { date: formatDateOnly(order.dueDate, language) })}
        </span>
        <Badge variant="neutral" size="xs" className={statusBadgeClass(order.status)}>
          {statusLabel(order.status, language)}
        </Badge>
        <Badge variant="neutral" size="xs" className={priorityBadgeClass(order.priority)}>
          {priorityLabel(order.priority, language)}
        </Badge>
      </div>
    </li>
  );
}

function OrderGroup({
  title,
  orders,
  overdue,
}: {
  title: string;
  orders: WorkOrderClientSummary[];
  overdue?: boolean;
}) {
  if (orders.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <ul className="divide-y divide-border-subtle">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} overdue={overdue} />
        ))}
      </ul>
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

  useEffect(() => {
    let active = true;
    collectAllPages((cursor) => listWorkOrders({ cursor }))
      .then((items) => active && setOrders({ kind: 'ready', items }))
      .catch(() => active && setOrders({ kind: 'error' }));
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Block id="home-attention" title={t('home.attention.title')}>
            <OrdersBody state={orders}>
              {() =>
                summary && summary.overdue.length + summary.upcoming.length > 0 ? (
                  <div className="space-y-4">
                    <OrderGroup
                      title={t('home.attention.overdue')}
                      orders={summary.overdue}
                      overdue
                    />
                    <OrderGroup title={t('home.attention.upcoming')} orders={summary.upcoming} />
                  </div>
                ) : (
                  <EmptyLine messageKey="home.attention.empty" />
                )
              }
            </OrdersBody>
          </Block>

          <Block id="home-owed" title={t('home.owed.title')}>
            <OrdersBody state={orders}>
              {() =>
                summary && summary.owed.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-fg-secondary" data-testid="owed-totals">
                      {t('home.owed.total')}{' '}
                      {summary.owedTotals.map((total, index) => (
                        <span key={total.currency}>
                          {index > 0 && ' · '}
                          <strong className="font-semibold tabular-nums text-fg-primary">
                            {money(total.remainingMinor, total.currency)}
                          </strong>
                        </span>
                      ))}
                    </p>
                    <ul className="divide-y divide-border-subtle">
                      {summary.owed.map((order) => (
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
                          <span className="font-semibold tabular-nums text-fg-primary">
                            {money(order.remainingMinor ?? 0, order.currency as Currency)}
                          </span>
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
        </div>

        <div className="space-y-6">
          <Block id="home-agenda" title={t('home.agenda.title')}>
            <OrdersBody state={orders}>
              {() =>
                summary && summary.dueToday.length > 0 ? (
                  <ul className="divide-y divide-border-subtle">
                    {summary.dueToday.map((order) => (
                      <li key={order.id} className="space-y-0.5 py-3">
                        <a href={detailsHref(order.id)} className={linkClass}>
                          {order.title}
                        </a>
                        <p className="text-sm text-fg-muted">{order.clientName}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLine messageKey="home.agenda.empty" />
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
    </div>
  );
}
