import { useEffect, useState } from 'react';
import { formatMoney, type Client, type WorkOrderClientSummary } from '@ijac/shared';
import { getClient, listWorkOrders } from '../../lib/resources';
import { collectAllPages } from '../../lib/collectAllPages';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, statusLabel } from '../../i18n/format';
import {
  Alert,
  LoadingState,
  Panel,
  buttonVariants,
  cn,
  figureClass,
  sectionHeadingClass,
} from '../ui';
import { StatusBadge } from '../work-orders/StatusBadge';
import { isOwed } from '../home/todaySummary';
import { owedByClient } from './clientBalance';

type ClientState =
  | { status: 'loading' }
  | { status: 'missing-id' }
  | { status: 'error'; kind: 'not-found' | 'load' }
  | { status: 'ready'; client: Client };

type OrdersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; orders: WorkOrderClientSummary[] };

const linkClass =
  'rounded font-medium text-fg-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

const ordersHref = (clientId: string) => `/work-orders?client=${encodeURIComponent(clientId)}`;

function BackToClients() {
  const { t } = useLanguage();
  return (
    <a
      href="/clients"
      className={cn(buttonVariants({ variant: 'secondary' }), 'min-h-11 rounded-lg px-4')}
    >
      {t('clients.back')}
    </a>
  );
}

/** One client in one place: who they are, what they owe, and their orders. */
export function ClientDetails() {
  const { t } = useLanguage();
  const [state, setState] = useState<ClientState>({ status: 'loading' });
  const [orders, setOrders] = useState<OrdersState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')?.trim();
    if (!id) {
      setState({ status: 'missing-id' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    setOrders({ status: 'loading' });
    getClient(id)
      .then((client) => active && setState({ status: 'ready', client }))
      .catch(
        (error: unknown) =>
          active &&
          setState({
            status: 'error',
            kind: error instanceof Error && error.message === 'NOT_FOUND' ? 'not-found' : 'load',
          }),
      );
    // The orders load on their own, so a failure there still shows who the client is.
    collectAllPages((cursor) => listWorkOrders({ clientId: id, cursor }))
      .then((items) => active && setOrders({ status: 'ready', orders: items }))
      .catch(() => active && setOrders({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-5" aria-busy="true">
        <BackToClients />
        <Panel size="lg">
          <LoadingState message={t('clients.detailsLoading')} />
        </Panel>
      </div>
    );
  }

  if (state.status === 'missing-id' || state.status === 'error') {
    const message =
      state.status === 'missing-id'
        ? t('clients.missingId')
        : t(state.kind === 'not-found' ? 'clients.notFound' : 'clients.detailsError');
    return (
      <div className="space-y-5">
        <BackToClients />
        <Alert
          type={state.status === 'missing-id' ? 'warning' : 'error'}
          role="alert"
          action={
            state.status === 'error' && state.kind === 'load'
              ? { label: t('common.retry'), onClick: () => setAttempt((n) => n + 1) }
              : undefined
          }
        >
          {message}
        </Alert>
      </div>
    );
  }

  const { client } = state;
  const contact: { label: string; value: React.ReactNode }[] = [
    {
      label: t('clients.email'),
      value: (
        <a href={`mailto:${client.email}`} className={linkClass}>
          {client.email}
        </a>
      ),
    },
    {
      label: t('clients.phone'),
      value: (
        <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
          {client.phone}
        </a>
      ),
    },
    ...(client.organization
      ? [{ label: t('clients.organization'), value: client.organization }]
      : []),
    ...(client.taxId ? [{ label: t('clients.taxId'), value: client.taxId }] : []),
    ...(client.notes?.trim() ? [{ label: t('clients.notes'), value: client.notes }] : []),
  ];

  return (
    <div className="space-y-6">
      <BackToClients />
      <h1 className="font-heading text-2xl font-semibold text-fg-primary sm:text-3xl">
        {client.name}
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Panel size="lg" className="border border-border-default">
            <dl className="space-y-3 text-sm">
              {contact.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-fg-secondary">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel size="lg" className="border border-border-default">
            <section aria-labelledby="client-balance" className="space-y-3">
              <h2 id="client-balance" className={sectionHeadingClass}>
                {t('clients.balance')}
              </h2>
              <BalanceBody clientId={client.id} orders={orders} />
            </section>
          </Panel>
        </div>

        <Panel size="lg" className="border border-border-default lg:col-span-2">
          <section aria-labelledby="client-orders" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="client-orders" className={sectionHeadingClass}>
                {t('clients.orders')}
              </h2>
              <a href={ordersHref(client.id)} className={cn(linkClass, 'text-sm')}>
                {t('clients.viewInOrders')}
              </a>
            </div>
            <OrdersBody orders={orders} />
          </section>
        </Panel>
      </div>
    </div>
  );
}

function BalanceBody({ clientId, orders }: { clientId: string; orders: OrdersState }) {
  const { t } = useLanguage();
  if (orders.status === 'loading')
    return <LoadingState size="sm" className="flex-row justify-start" />;
  if (orders.status === 'error') {
    return <p className="text-sm text-fg-muted">{t('clients.balanceUnavailable')}</p>;
  }
  const owed = owedByClient(orders.orders).get(clientId) ?? [];
  if (owed.length === 0)
    return <p className="text-sm text-fg-secondary">{t('clients.noBalance')}</p>;
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {owed.map((amount) => (
          <span key={amount.currency} className={cn(figureClass, 'text-2xl')}>
            {formatMoney(amount.minor, amount.currency)}
          </span>
        ))}
      </p>
      <a href={`${ordersHref(clientId)}&balance=owed`} className={cn(linkClass, 'text-sm')}>
        {t('home.owed.viewAll')}
      </a>
    </div>
  );
}

function OrdersBody({ orders }: { orders: OrdersState }) {
  const { t, language } = useLanguage();
  if (orders.status === 'loading')
    return <LoadingState size="sm" className="flex-row justify-start" />;
  if (orders.status === 'error') {
    return <p className="text-sm text-fg-muted">{t('clients.ordersError')}</p>;
  }
  if (orders.orders.length === 0) {
    return <p className="text-sm text-fg-secondary">{t('clients.noOrdersYet')}</p>;
  }
  const newestFirst = [...orders.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ul className="divide-y divide-border-subtle">
      {newestFirst.map((order) => {
        const paidUp =
          order.currency !== undefined &&
          (order.paidMinor ?? 0) > 0 &&
          (order.remainingMinor ?? 0) <= 0;
        return (
          <li
            key={order.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="min-w-0 space-y-1">
              <a
                href={`/work-orders/details?id=${encodeURIComponent(order.id)}`}
                className={linkClass}
              >
                {order.title}
              </a>
              {order.totalPriceMinor !== undefined && order.currency && (
                <p className="text-sm tabular-nums text-fg-secondary">
                  {formatMoney(order.totalPriceMinor, order.currency)}
                  {isOwed(order) && (
                    <>
                      {' · '}
                      <span className="font-semibold text-fg-primary">
                        {t('workOrders.balanceDue', {
                          value: formatMoney(order.remainingMinor ?? 0, order.currency),
                        })}
                      </span>
                    </>
                  )}
                  {paidUp && ` · ${t('workOrders.paidUp')}`}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {order.dueDate && (
                <span className="tabular-nums text-fg-secondary">
                  {t('workOrders.dueOn', { date: formatDateOnly(order.dueDate, language) })}
                </span>
              )}
              <StatusBadge status={order.status} size="xs">
                {statusLabel(order.status, language)}
              </StatusBadge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
