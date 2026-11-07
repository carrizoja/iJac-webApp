import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_METHODS,
  PaymentMethod,
  PaymentStatus,
  WorkOrderStatus,
  formatMoney,
  formatReceiptNumber,
  type Payment,
  type WorkOrderPaymentsResponse,
} from '@ijac/shared';
import { ApiRequestError, listPayments, recordPayment, voidPayment } from '../../lib/resources';
import { parseMoneyInput } from '../../lib/money';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';
import { Alert, Badge, Button, Dialog, Input, LoadingState, Panel, Select, Textarea } from '../ui';
import { ReceiptPrintView } from './ReceiptPrintView';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: WorkOrderPaymentsResponse };

type AmountError = 'invalid' | 'exceeds';

interface RecordForm {
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  notes: string;
}

interface RecordErrors {
  amount?: AmountError;
  paymentDate?: boolean;
  method?: boolean;
  /** Pre-translated form-level message. */
  general?: string;
  profileMissing?: boolean;
}

function today(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function emptyForm(): RecordForm {
  return { amount: '', paymentDate: today(), method: PaymentMethod.CASH, notes: '' };
}

const methodKey = (method: PaymentMethod) => `payments.method.${method}` as TranslationKey;

interface PaymentsPanelProps {
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
}

export function PaymentsPanel({ workOrderId, workOrderStatus }: PaymentsPanelProps) {
  const { language, t } = useLanguage();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [recordOpen, setRecordOpen] = useState(false);
  /** One key per record form; reused for retries so a lost response cannot double-record. */
  const idempotencyKey = useRef<string>('');
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [errors, setErrors] = useState<RecordErrors>({});
  const [submitting, setSubmitting] = useState(false);
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
  const remainingText = balance ? money(balance.remainingMinor) : '';
  const anyVoided = items.some((payment) => payment.status === PaymentStatus.VOIDED);

  const openRecord = () => {
    idempotencyKey.current = crypto.randomUUID();
    setForm(emptyForm());
    setErrors({});
    setRecorded(null);
    setRecordOpen(true);
  };

  const submitRecord = async () => {
    if (!balance || submitting) return;
    const amountMinor = parseMoneyInput(form.amount);
    const next: RecordErrors = {};
    if (amountMinor === null || amountMinor <= 0) next.amount = 'invalid';
    else if (amountMinor > balance.remainingMinor) next.amount = 'exceeds';
    if (!form.paymentDate) next.paymentDate = true;
    if (next.amount || next.paymentDate || amountMinor === null) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payment = await recordPayment(workOrderId, {
        amountMinor,
        paymentDate: form.paymentDate,
        method: form.method,
        ...(form.notes.trim() && { notes: form.notes.trim() }),
        idempotencyKey: idempotencyKey.current,
      });
      setRecordOpen(false);
      setRecorded(payment);
      await reload();
    } catch (error) {
      setErrors(mapRecordError(error));
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const mapRecordError = (error: unknown): RecordErrors => {
    if (!(error instanceof ApiRequestError)) return { general: t('payments.recordError') };
    switch (error.code) {
      case PAYMENT_ERROR_CODES.ORGANIZATION_PROFILE_NOT_CONFIGURED:
        return { profileMissing: true };
      case PAYMENT_ERROR_CODES.WORK_ORDER_NOT_PRICED:
        return { general: t('payments.unpricedHint') };
      case PAYMENT_ERROR_CODES.WORK_ORDER_CANCELLED:
        return { general: t('payments.cancelledHint') };
      case PAYMENT_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT:
        // The key is bound to another work order; a retry needs a fresh one.
        idempotencyKey.current = crypto.randomUUID();
        return { general: t('payments.recordError') };
    }
    const next: RecordErrors = {};
    const unmapped: string[] = [];
    for (const [key, message] of Object.entries(error.fieldErrors ?? {})) {
      if (key === 'amountMinor') {
        next.amount =
          error.code === PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE ? 'exceeds' : 'invalid';
      } else if (key === 'paymentDate') next.paymentDate = true;
      else if (key === 'method') next.method = true;
      else unmapped.push(message);
    }
    if (unmapped.length > 0 || Object.keys(next).length === 0) {
      next.general = [t('payments.recordError'), ...unmapped].join(' ');
    }
    return next;
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

  const amountError =
    errors.amount === 'invalid'
      ? t('payments.validation.amount')
      : errors.amount === 'exceeds'
        ? t('payments.validation.amountExceeds', { remaining: remainingText })
        : undefined;

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
            variant="secondary"
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

      <Dialog
        isOpen={recordOpen}
        onClose={() => setRecordOpen(false)}
        title={t('payments.recordTitle')}
        primaryAction={{
          label: submitting ? t('payments.submitting') : t('payments.submit'),
          onClick: submitRecord,
          isLoading: submitting,
        }}
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitRecord();
          }}
        >
          {errors.profileMissing && (
            <Alert type="warning" role="alert">
              <p>{t('payments.profileMissing')}</p>
              <a href="/settings" className="font-medium underline">
                {t('payments.profileLink')}
              </a>
            </Alert>
          )}
          {errors.general && (
            <Alert type="error" role="alert">
              {errors.general}
            </Alert>
          )}
          <Input
            id="payment-amount"
            label={t('payments.amountLabel')}
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            helpText={t('payments.amountHelp', { remaining: remainingText })}
            error={amountError}
            required
          />
          <Input
            id="payment-date"
            type="date"
            label={t('payments.dateLabel')}
            value={form.paymentDate}
            onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
            error={errors.paymentDate ? t('payments.validation.date') : undefined}
            required
          />
          <Select
            id="payment-method"
            label={t('payments.methodLabel')}
            value={form.method}
            onChange={(event) => setForm({ ...form, method: event.target.value as PaymentMethod })}
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              label: t(methodKey(method)),
            }))}
            error={errors.method ? t('payments.validation.method') : undefined}
            required
          />
          <Textarea
            id="payment-notes"
            label={t('payments.notesLabel')}
            helpText={t('payments.notesHelp')}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            rows={2}
          />
        </form>
      </Dialog>

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
          <dl
            className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border-default p-3 text-sm"
            data-testid="void-payment-summary"
          >
            {(
              [
                ['payments.client', voidTarget.client.name],
                ['payments.amount', formatMoney(voidTarget.amountMinor, voidTarget.currency)],
                ['payments.date', formatDateOnly(voidTarget.paymentDate, language)],
                ['payments.method', t(methodKey(voidTarget.method))],
              ] as const
            ).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  {t(key)}
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-fg-primary">{value}</dd>
              </div>
            ))}
          </dl>
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
