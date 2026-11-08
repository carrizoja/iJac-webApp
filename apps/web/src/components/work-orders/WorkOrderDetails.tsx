import { useEffect, useState } from 'react';
import {
  WORK_ORDER_STATUSES,
  formatMoney,
  type Client,
  type WorkOrder,
  WorkOrderStatus,
} from '@ijac/shared';
import { FileDown, MessageCircle, Pencil } from 'lucide-react';
import { getClient, getWorkOrder, listClients, updateWorkOrder } from '../../lib/resources';
import { collectAllPages } from '../../lib/collectAllPages';
import { useRevealOnOpen } from '../../hooks/useRevealOnOpen';
import { WorkOrderForm } from './WorkOrderForm';
import {
  Alert,
  Badge,
  Button,
  buttonVariants,
  cn,
  Dialog,
  LoadingState,
  Panel,
  Select,
} from '../ui';
import { PaymentsPanel } from '../payments/PaymentsPanel';
import { priorityBadgeClass, statusBadgeClass } from './workOrderBadges';
import { isOverdue, localDateKey } from '../home/todaySummary';
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
      className={cn(
        buttonVariants({ variant: 'secondary' }),
        'work-order-print-hidden min-h-11 rounded-lg px-4',
      )}
    >
      {t('workOrders.back')}
    </a>
  );
}

export function WorkOrderDetails() {
  const { language, t } = useLanguage();
  const [state, setState] = useState<DetailsState>({ status: 'loading' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  /** The status picked in the select; it is saved only when the save button is pressed. */
  const [draftStatus, setDraftStatus] = useState<WorkOrderStatus | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState(false);
  /** Bumped after an edit is saved so the order and its client load again. */
  const [reloadKey, setReloadKey] = useState(0);
  const { panelRef, focusRef } = useRevealOnOpen<HTMLHeadingElement>(
    editing && state.status === 'ready' ? state.workOrder.id : null,
  );

  // The form offers every client, so they load only when editing starts.
  useEffect(() => {
    if (!editing) return;
    let active = true;
    setClientsError(false);
    collectAllPages((cursor) => listClients({ cursor }))
      .then((items) => active && setClients(items))
      .catch(() => active && setClientsError(true));
    return () => {
      active = false;
    };
  }, [editing]);

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
  }, [reloadKey]);

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
        <Alert
          type="error"
          role="alert"
          action={
            state.kind === 'load'
              ? {
                  label: t('common.retry'),
                  onClick: () => {
                    setState({ status: 'loading' });
                    setReloadKey((key) => key + 1);
                  },
                }
              : undefined
          }
        >
          {t(state.kind === 'not-found' ? 'workOrders.notFound' : 'workOrders.detailsError')}
        </Alert>
      </div>
    );
  }

  const { workOrder, client } = state;

  const selectedStatus = draftStatus ?? workOrder.status;
  const statusChanged = selectedStatus !== workOrder.status;

  const changeStatus = async (next: WorkOrderStatus) => {
    if (next === workOrder.status || savingStatus) return;
    setConfirmingCancel(false);
    setSavingStatus(true);
    setStatusError(false);
    setStatusAnnouncement('');
    try {
      const updated = await updateWorkOrder(workOrder.id, { status: next });
      setState({ status: 'ready', workOrder: updated, client });
      setStatusAnnouncement(
        t('workOrders.statusUpdated', { value: statusLabel(updated.status, language) }),
      );
    } catch {
      setStatusError(true);
    } finally {
      setDraftStatus(null);
      setSavingStatus(false);
    }
  };

  // Cancelling blocks new payments, so it is confirmed first; other changes save directly.
  const saveStatus = () => {
    if (!statusChanged) return;
    if (selectedStatus === WorkOrderStatus.CANCELLED) {
      setConfirmingCancel(true);
      return;
    }
    void changeStatus(selectedStatus);
  };

  const overdue = isOverdue(workOrder, localDateKey(new Date()));
  const organization = client.organization?.trim();
  // Skip the organization when it only repeats the client's name.
  const showOrganization =
    organization !== undefined &&
    organization !== '' &&
    organization.toLocaleLowerCase() !== client.name.trim().toLocaleLowerCase();
  const clientDisplayName = showOrganization ? `${client.name} (${organization})` : client.name;
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
    <article className="work-order-print-document space-y-6" aria-labelledby="work-order-title">
      <BackToOrders />

      <header className="rounded-2xl border border-border-default bg-bg-secondary/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1
              id="work-order-title"
              className="font-heading text-2xl font-semibold leading-tight text-fg-primary sm:text-3xl"
            >
              {workOrder.title}
            </h1>
            <p className="text-fg-secondary">{clientDisplayName}</p>
          </div>
          <div className="work-order-print-hidden flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              startIcon={<Pencil aria-hidden="true" focusable="false" className="h-4 w-4" />}
            >
              {t('common.edit')}
            </Button>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('workOrders.documentActions')}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                startIcon={<FileDown aria-hidden="true" focusable="false" className="h-4 w-4" />}
              >
                {t('workOrders.savePdf')}
              </Button>
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-default bg-panel-default px-3 text-sm font-medium text-fg-primary transition-fast hover:bg-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <MessageCircle aria-hidden="true" focusable="false" className="mr-2 h-4 w-4" />
                {t('workOrders.shareWhatsApp')}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="tone" className={statusBadgeClass(workOrder.status)}>
              {t('workOrders.statusValue', { value: statusLabel(workOrder.status, language) })}
            </Badge>
            <Badge variant="tone" className={priorityBadgeClass(workOrder.priority)}>
              {t('workOrders.priorityValue', {
                value: priorityLabel(workOrder.priority, language),
              })}
            </Badge>
            {overdue && <Badge variant="error">{t('workOrders.overdue')}</Badge>}
            <span
              className={
                overdue ? 'text-sm font-medium text-destructive-text' : 'text-sm text-fg-muted'
              }
            >
              {t('workOrders.shareMessageDue', { value: dueDate })}
            </span>
          </div>
          <div className="work-order-print-hidden flex w-full items-end gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Select
                id="work-order-status"
                label={t('workOrders.changeStatus')}
                value={selectedStatus}
                // While the form is open it saves the status too, so changing it here would be undone.
                disabled={savingStatus || editing}
                onChange={(event) => setDraftStatus(event.target.value as WorkOrderStatus)}
                options={WORK_ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: statusLabel(status, language),
                }))}
                error={statusError ? t('workOrders.statusError') : undefined}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={saveStatus}
              disabled={!statusChanged || savingStatus || editing}
              isLoading={savingStatus}
            >
              {t('workOrders.saveStatus')}
            </Button>
          </div>
        </div>
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          data-testid="work-order-status-announcement"
        >
          {statusAnnouncement}
        </p>
        <Dialog
          isOpen={confirmingCancel}
          onClose={() => {
            setConfirmingCancel(false);
            setDraftStatus(null);
          }}
          title={t('workOrders.cancelConfirmTitle')}
          primaryAction={{
            label: t('workOrders.cancelConfirmSubmit'),
            onClick: () => changeStatus(WorkOrderStatus.CANCELLED),
            destructive: true,
            isLoading: savingStatus,
          }}
          secondaryAction={{ label: t('workOrders.cancelConfirmBack') }}
        >
          <p>{t('workOrders.cancelConfirmBody')}</p>
        </Dialog>
        <p className="work-order-print-hidden mt-4 text-xs leading-5 text-fg-muted">
          {t('workOrders.pdfHelper')}
        </p>
      </header>

      {editing && (
        <div
          ref={panelRef}
          className="work-order-print-hidden scroll-mt-24 rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6"
          data-testid="work-order-edit-panel"
        >
          <h2
            ref={focusRef}
            tabIndex={-1}
            className="mb-5 font-heading text-xl font-semibold text-fg-primary focus:outline-none"
          >
            {t('workOrders.edit')}
          </h2>
          {clientsError ? (
            <Alert type="error" className="mb-4">
              {t('clients.loadError')}
            </Alert>
          ) : null}
          <WorkOrderForm
            key={workOrder.id}
            clients={clients.length > 0 ? clients : [client]}
            workOrder={workOrder}
            onSaved={() => {
              setEditing(false);
              setReloadKey((key) => key + 1);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      <PaymentsPanel
        workOrderId={workOrder.id}
        workOrderStatus={workOrder.status}
        orderTitle={workOrder.title}
        clientName={clientDisplayName}
      />

      <Panel size="lg" className="border border-border-default" data-print-panel>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          {t('workOrders.description')}
        </h2>
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-fg-secondary">
          {workOrder.description?.trim() || t('workOrders.noDescription')}
        </p>
      </Panel>

      <Panel size="lg" className="border border-border-default" data-print-panel>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('workOrders.totalPrice')}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-fg-primary">
              {workOrder.totalPriceMinor !== undefined && workOrder.currency
                ? formatMoney(workOrder.totalPriceMinor, workOrder.currency)
                : t('workOrders.noPrice')}
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
