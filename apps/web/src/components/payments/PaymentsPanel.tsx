import { useCallback, useEffect, useState } from 'react';
import {
  PaymentStatus,
  WorkOrderStatus,
  formatMoney,
  formatReceiptNumber,
  type Payment,
  type WorkOrderPaymentsResponse,
} from '@ijac/shared';
import { ApiRequestError, listPayments, voidPayment } from '../../lib/resources';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly } from '../../i18n/format';
import { Alert, Badge, Button, Dialog, LoadingState, Panel, Textarea } from '../ui';
import { PaymentSummary } from './PaymentSummary';
import { ReceiptPrintView } from './ReceiptPrintView';
import { RecordPaymentDialog, paymentMethodKey as methodKey } from './RecordPaymentDialog';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: WorkOrderPaymentsResponse };

interface PaymentsPanelProps {
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  orderTitle: string;
  clientName: string;
}

export function PaymentsPanel({
  workOrderId,
  workOrderStatus,
  orderTitle,
  clientName,
}: PaymentsPanelProps) {
  const { language, t } = useLanguage();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [recordOpen, setRecordOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  /** The payment just recorded, confirmed until dismissed or another action starts. */
  const [recorded, setRecorded] = useState<Payment | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await listPayments(workOrderId);
      setState({ status: 'ready', data });
    } catch {
      setState((current) => (current.status === 'ready' ? current : { status: 'error' }));
    }
  }, [workOrderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (state.status === 'loading') {
    return (
      <Panel size="lg" className="border border-border-default" aria-busy="true">
        <LoadingState message={t('payments.loading')} />
      </Panel>
    );
  }

  if (state.status === 'error') {
    return (
      <Panel size="lg" className="border border-border-default">
        <Alert
          type="error"
          role="alert"
          action={{
            label: t('common.retry'),
            onClick: () => {
              setState({ status: 'loading' });
              void reload();
            },
          }}
        >
          {t('payments.loadError')}
        </Alert>
      </Panel>
    );
  }

  const { items, balance, canManage } = state.data;
  const cancelled = workOrderStatus === WorkOrderStatus.CANCELLED;
  const settled = balance !== null && balance.remainingMinor <= 0;
  const canRecord = canManage && balance !== null && !cancelled && !settled;
  const money = (minor: number) => (balance ? formatMoney(minor, balance.currency) : '');
  const anyVoided = items.some((payment) => payment.status === PaymentStatus.VOIDED);

  const openRecord = () => {
    setRecorded(null);
    setRecordOpen(true);
  };

  const openVoid = (payment: Payment) => {
    setRecorded(null);
    setVoidReason('');
    setVoidError(null);
    setVoidTarget(payment);
  };

  const submitVoid = async () => {
    if (!voidTarget || voiding) return;
    const reason = voidReason.trim();
    if (!reason) {
      setVoidError(t('payments.voidReasonRequired'));
      return;
    }
    setVoiding(true);
    setVoidError(null);
    try {
      await voidPayment(workOrderId, voidTarget.id, { reason });
      setVoidTarget(null);
      await reload();
    } catch (error) {
      const unmapped = Object.values(
        error instanceof ApiRequestError ? (error.fieldErrors ?? {}) : {},
      );
      setVoidError([t('payments.voidError'), ...unmapped].join(' '));
      await reload();
    } finally {
      setVoiding(false);
    }
  };

  return (
    <Panel
      id="payments"
      size="lg"
      className="scroll-mt-24 border border-border-default"
      data-print-panel
      aria-labelledby="payments-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="payments-title"
          className="text-sm font-semibold uppercase tracking-wider text-fg-muted"
        >
          {t('payments.title')}
        </h2>
        {canRecord && (
          <Button
            type="button"
            variant="primary"
            className="work-order-print-hidden"
            onClick={openRecord}
          >
            {t('payments.record')}
          </Button>
        )}
      </div>

      {recorded && (
        <Alert
          type="success"
          role="status"
          data-testid="payment-recorded"
          className="work-order-print-hidden mt-4"
          action={{ label: t('payments.viewReceipt'), onClick: () => setReceipt(recorded) }}
          onClose={() => setRecorded(null)}
        >
          {t('payments.recorded', { number: formatReceiptNumber(recorded.receiptNumber) })}
        </Alert>
      )}

      {balance ? (
        <dl className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div data-testid="payments-remaining">
            <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('payments.remaining')}
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-semibold tabular-nums text-fg-primary">
              {money(balance.remainingMinor)}
              {settled && <Badge variant="success">{t('payments.settled')}</Badge>}
            </dd>
          </div>
          {(
            [
              ['payments.total', balance.totalMinor],
              ['payments.paid', balance.paidMinor],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {t(key)}
              </dt>
              <dd className="mt-1 text-base font-medium tabular-nums text-fg-secondary">
                {money(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <Alert type="info" role="status" className="mt-4">
          {t('payments.unpricedHint')}
        </Alert>
      )}

      {canManage && balance && cancelled && (
        <p className="mt-4 text-sm text-fg-muted">{t('payments.cancelledHint')}</p>
      )}
      {canManage && settled && !cancelled && (
        <p className="mt-4 text-sm text-fg-muted">{t('payments.settledHint')}</p>
      )}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">{t('payments.empty')}</p>
      ) : (
        <div
          className="mt-6 overflow-x-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          role="region"
          aria-label={t('payments.list')}
          tabIndex={0}
        >
          <table className="w-full text-left text-sm" aria-label={t('payments.list')}>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-fg-muted">
                <th scope="col" className="py-2 pr-4">
                  {t('payments.receiptNumber')}
                </th>
                <th scope="col" className="py-2 pr-4">
                  {t('payments.date')}
                </th>
                <th scope="col" className="py-2 pr-4">
                  {t('payments.method')}
                </th>
                <th scope="col" className="py-2 pr-4">
                  {t('payments.amount')}
                </th>
                {/* Only voided payments carry a status, so the column appears with the first one. */}
                {anyVoided && (
                  <th scope="col" className="py-2 pr-4">
                    {t('payments.status')}
                  </th>
                )}
                <th scope="col" className="work-order-print-hidden py-2">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => {
                const number = formatReceiptNumber(payment.receiptNumber);
                const voided = payment.status === PaymentStatus.VOIDED;
                return (
                  <tr key={payment.id} className="border-t border-border-subtle align-top">
                    <td className="py-3 pr-4 font-mono">{number}</td>
                    <td className="py-3 pr-4">{formatDateOnly(payment.paymentDate, language)}</td>
                    <td className="py-3 pr-4">{t(methodKey(payment.method))}</td>
                    <td className="py-3 pr-4">
                      <span className={voided ? 'line-through' : undefined}>
                        {formatMoney(payment.amountMinor, payment.currency)}
                      </span>
                    </td>
                    {anyVoided && (
                      <td className="py-3 pr-4">
                        {/* Only the exception is badged; an active payment needs no label. */}
                        {voided && <Badge variant="error">{t('payments.status.voided')}</Badge>}
                        {voided && payment.void && (
                          <p className="mt-1 text-xs text-fg-muted">
                            {t('payments.voidedReason', { reason: payment.void.reason })}
                          </p>
                        )}
                      </td>
                    )}
                    <td className="work-order-print-hidden py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label={t('payments.viewReceiptNamed', { number })}
                          onClick={() => setReceipt(payment)}
                        >
                          {t('payments.viewReceipt')}
                        </Button>
                        {canManage && !voided && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-2 text-destructive-text"
                            aria-label={t('payments.voidNamed', { number })}
                            onClick={() => openVoid(payment)}
                          >
                            {t('payments.void')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {balance && (
        <RecordPaymentDialog
          isOpen={recordOpen}
          onClose={() => setRecordOpen(false)}
          workOrderId={workOrderId}
          orderTitle={orderTitle}
          clientName={clientName}
          remainingMinor={balance.remainingMinor}
          currency={balance.currency}
          onRecorded={(payment) => {
            setRecorded(payment);
            void reload();
          }}
          onFailed={() => void reload()}
        />
      )}

      <Dialog
        isOpen={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        title={
          voidTarget
            ? t('payments.voidTitle', { number: formatReceiptNumber(voidTarget.receiptNumber) })
            : ''
        }
        primaryAction={{
          label: t('payments.voidSubmit'),
          onClick: submitVoid,
          destructive: true,
          isLoading: voiding,
        }}
      >
        {voidTarget && (
          // Voiding cannot be undone, so the dialog names exactly which payment it affects.
          <PaymentSummary
            className="mb-4"
            data-testid="void-payment-summary"
            items={[
              { label: t('payments.client'), value: voidTarget.client.name },
              {
                label: t('payments.amount'),
                value: formatMoney(voidTarget.amountMinor, voidTarget.currency),
              },
              {
                label: t('payments.date'),
                value: formatDateOnly(voidTarget.paymentDate, language),
              },
              { label: t('payments.method'), value: t(methodKey(voidTarget.method)) },
            ]}
          />
        )}
        <p>{t('payments.voidWarning')}</p>
        <Textarea
          id="payment-void-reason"
          label={t('payments.voidReasonLabel')}
          value={voidReason}
          onChange={(event) => setVoidReason(event.target.value)}
          error={voidError ?? undefined}
          rows={3}
          required
        />
      </Dialog>

      {receipt && <ReceiptPrintView payment={receipt} onClose={() => setReceipt(null)} />}
    </Panel>
  );
}
