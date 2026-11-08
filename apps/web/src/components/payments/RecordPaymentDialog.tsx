import { useEffect, useRef, useState } from 'react';
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_METHODS,
  PaymentMethod,
  formatMoney,
  type Currency,
  type Payment,
} from '@ijac/shared';
import { ApiRequestError, getOrganizationProfile, recordPayment } from '../../lib/resources';
import { parseMoneyInput } from '../../lib/money';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';
import { Alert, Dialog, Input, Select, Textarea } from '../ui';

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

export const paymentMethodKey = (method: PaymentMethod) =>
  `payments.method.${method}` as TranslationKey;

export interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  /** Named in the summary, so the payment is recorded against the right order. */
  orderTitle: string;
  clientName: string;
  /** What is still owed; the amount may not exceed it. */
  remainingMinor: number;
  currency: Currency;
  /** Amount the form opens with, as an es-AR money string; empty by default. */
  initialAmount?: string;
  /** Called with the new payment after the dialog closes itself. */
  onRecorded: (payment: Payment) => void;
  /** Called after a failed attempt, e.g. to reload a balance that may have changed. */
  onFailed?: () => void;
}

/** The form that records one payment against a work order, shared by the order page and Hoy. */
export function RecordPaymentDialog({
  isOpen,
  onClose,
  workOrderId,
  orderTitle,
  clientName,
  remainingMinor,
  currency,
  initialAmount = '',
  onRecorded,
  onFailed,
}: RecordPaymentDialogProps) {
  const { t } = useLanguage();
  /** One key per opened form; reused for retries so a lost response cannot double-record. */
  const idempotencyKey = useRef<string>('');
  const [form, setForm] = useState<RecordForm>({
    amount: initialAmount,
    paymentDate: today(),
    method: PaymentMethod.CASH,
    notes: '',
  });
  const [errors, setErrors] = useState<RecordErrors>({});
  const [submitting, setSubmitting] = useState(false);
  /** Checked on opening so a missing profile is reported before the form is filled. */
  const [profileMissing, setProfileMissing] = useState(false);

  // Each opening starts a fresh form with its own idempotency key.
  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setForm({ amount: initialAmount, paymentDate: today(), method: PaymentMethod.CASH, notes: '' });
    setErrors({});
    setProfileMissing(false);
    let cancelled = false;
    getOrganizationProfile()
      .then((status) => {
        if (!cancelled) setProfileMissing(!status.configured);
      })
      // The server still refuses an unconfigured profile, so a failed check only skips the early warning.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Only a new opening resets the form, not a changed prefill while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workOrderId]);

  const remainingText = formatMoney(remainingMinor, currency);

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

  const blocked = profileMissing || Boolean(errors.profileMissing);
  const typedMinor = parseMoneyInput(form.amount);
  const submitLabel =
    typedMinor !== null && typedMinor > 0
      ? t('payments.submitAmount', { amount: formatMoney(typedMinor, currency) })
      : t('payments.submit');

  const submit = async () => {
    if (submitting || blocked) return;
    const amountMinor = parseMoneyInput(form.amount);
    const next: RecordErrors = {};
    if (amountMinor === null || amountMinor <= 0) next.amount = 'invalid';
    else if (amountMinor > remainingMinor) next.amount = 'exceeds';
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
      onClose();
      onRecorded(payment);
    } catch (error) {
      // What was typed stays in the form, so it can be corrected and sent again.
      setErrors(mapRecordError(error));
      onFailed?.();
    } finally {
      setSubmitting(false);
    }
  };

  const amountError =
    errors.amount === 'invalid'
      ? t('payments.validation.amount')
      : errors.amount === 'exceeds'
        ? t('payments.validation.amountExceeds', { remaining: remainingText })
        : undefined;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('payments.recordTitle')}
      primaryAction={{
        label: submitting ? t('payments.submitting') : submitLabel,
        onClick: submit,
        isLoading: submitting,
        disabled: blocked,
      }}
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {/* Recorded payments cannot be edited, so the dialog names what this one is for. */}
        <dl
          className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border-default p-3 text-sm"
          data-testid="record-payment-summary"
        >
          {(
            [
              ['payments.order', orderTitle],
              ['payments.client', clientName],
              ['payments.remaining', remainingText],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className={key === 'payments.order' ? 'col-span-2' : undefined}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {t(key)}
              </dt>
              <dd className="mt-0.5 break-words font-medium tabular-nums text-fg-primary">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {blocked && (
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
            label: t(paymentMethodKey(method)),
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
  );
}
