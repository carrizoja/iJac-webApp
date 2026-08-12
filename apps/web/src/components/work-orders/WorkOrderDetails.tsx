import { useEffect, useState } from 'react';
import type { Client, WorkOrder } from '@ijac/shared';
import { FileDown, MessageCircle } from 'lucide-react';
import { getClient, getWorkOrder } from '../../lib/resources';
import { Alert, Badge, Button, LoadingState, Panel } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, formatDateTime, priorityLabel, statusLabel } from '../../i18n/format';

type DetailsState =
  | { status: 'loading' }
  | { status: 'missing-id' }
  | { status: 'error'; kind: 'not-found' | 'load' }
  | { status: 'ready'; workOrder: WorkOrder; client: Client };

function BackToOrders() {
  const { t } = useLanguage();
  return (
    <a
      href="/work-orders"
      className="work-order-print-hidden action-surface inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium transition-colors hover:border-accent-brand hover:text-accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {t('workOrders.back')}
    </a>
  );
}

export function WorkOrderDetails() {
  const { language, t } = useLanguage();
  const [state, setState] = useState<DetailsState>({ status: 'loading' });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')?.trim();
    if (!id) {
      setState({ status: 'missing-id' });
      return;
    }

    const workOrderId = id;
    let cancelled = false;

    async function load() {
      try {
        const workOrder = await getWorkOrder(workOrderId);
        const client = await getClient(workOrder.clientId);
        if (!cancelled) setState({ status: 'ready', workOrder, client });
      } catch (error) {
        if (cancelled) return;

        const code = error instanceof Error ? error.message : '';
        setState({
          status: 'error',
          kind: code === 'NOT_FOUND' ? 'not-found' : 'load',
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="space-y-5" aria-busy="true">
        <BackToOrders />
        <Panel size="lg" data-testid="work-order-details-loading">
          <LoadingState message={t('workOrders.detailsLoading')} />
        </Panel>
      </div>
    );
  }

  if (state.status === 'missing-id') {
    return (
      <div className="space-y-5">
        <BackToOrders />
        <Alert type="warning" role="alert">
          {t('workOrders.missingId')}
        </Alert>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-5">
        <BackToOrders />
        <Alert type="error" role="alert">
          {t(state.kind === 'not-found' ? 'workOrders.notFound' : 'workOrders.detailsError')}
        </Alert>
      </div>
    );
  }

  const { workOrder, client } = state;
  const organization = client.organization?.trim();
  const clientDisplayName = organization ? `${client.name} (${organization})` : client.name;
  const dueDate = formatDateOnly(workOrder.dueDate, language);
  const detailsUrl = window.location.href;
  const whatsAppMessage = [
    t('workOrders.shareMessageTitle', { title: workOrder.title }),
    t('workOrders.shareMessageClient', { client: clientDisplayName }),
    t('workOrders.statusValue', { value: statusLabel(workOrder.status, language) }),
    t('workOrders.priorityValue', { value: priorityLabel(workOrder.priority, language) }),
    t('workOrders.shareMessageDue', { value: dueDate }),
    t('workOrders.shareMessageUrl', { url: detailsUrl }),
  ].join('\n');
  const whatsAppHref = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

  return (
    <article
      className="work-order-print-document space-y-6"
      aria-labelledby="work-order-title"
    >
      <BackToOrders />

      <div
        className="work-order-print-hidden rounded-xl border border-border-default bg-bg-secondary/60 p-4 sm:p-5"
        role="group"
        aria-label={t('workOrders.documentActions')}
      >
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => window.print()}
            startIcon={<FileDown aria-hidden="true" focusable="false" className="h-5 w-5" />}
          >
            {t('workOrders.savePdf')}
          </Button>
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="action-brand inline-flex min-h-11 items-center justify-center rounded-md border px-6 text-base font-medium transition-fast active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <MessageCircle
              aria-hidden="true"
              focusable="false"
              className="mr-2 h-5 w-5"
            />
            {t('workOrders.shareWhatsApp')}
          </a>
        </div>
        <p className="mt-3 text-sm leading-6 text-fg-muted">{t('workOrders.pdfHelper')}</p>
      </div>

      <header className="rounded-2xl border border-border-default bg-bg-secondary/80 px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-brand">
          {t('workOrders.eyebrow')}
        </p>
        <h1
          id="work-order-title"
          className="mt-4 max-w-4xl font-heading text-3xl font-semibold leading-tight text-fg-primary sm:text-5xl"
        >
          {workOrder.title}
        </h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="neutral">
            {t('workOrders.statusValue', { value: statusLabel(workOrder.status, language) })}
          </Badge>
          <Badge variant="neutral">
            {t('workOrders.priorityValue', { value: priorityLabel(workOrder.priority, language) })}
          </Badge>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]">
        <Panel size="lg" className="border border-border-default" data-print-panel>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            {t('workOrders.description')}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-fg-secondary">
            {workOrder.description?.trim() || t('workOrders.noDescription')}
          </p>
        </Panel>

        <Panel size="lg" className="border border-border-default" data-print-panel>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
            {t('workOrders.client')}
          </h2>
          <p className="mt-4 text-xl font-semibold text-fg-primary">{client.name}</p>
          {client.organization?.trim() ? (
            <p className="mt-1 text-sm text-fg-secondary">{client.organization}</p>
          ) : null}
        </Panel>
      </div>

      <Panel size="lg" className="border border-border-default" data-print-panel>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('workOrders.due')}
            </dt>
            <dd className="mt-2 text-sm text-fg-primary">
              {dueDate}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('workOrders.created')}
            </dt>
            <dd className="mt-2 text-sm text-fg-primary">
              {formatDateTime(workOrder.createdAt, language)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('workOrders.updated')}
            </dt>
            <dd className="mt-2 text-sm text-fg-primary">
              {formatDateTime(workOrder.updatedAt, language)}
            </dd>
          </div>
        </dl>
      </Panel>
    </article>
  );
}
