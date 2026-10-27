import { Inject, Injectable } from '@nestjs/common';
import {
  computeBalance,
  Payment,
  PAYMENT_METHODS,
  PaymentActor,
  PaymentMethod,
  RecordPaymentInput,
  WorkOrderBalance,
} from '@ijac/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { WorkOrderRepository } from '../work-orders/work-order.repository';
import { PAYMENT_REPOSITORY } from './payment.constants';
import { PaymentRepository } from './payment.repository';

export const MAX_TEXT_LENGTH = 500;

/** True for a real `YYYY-MM-DD` calendar date (rejects `2026-02-30`). */
function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
  ) {}

  async list(
    organizationId: string,
    workOrderId: string,
  ): Promise<{ items: Payment[]; balance: WorkOrderBalance | null }> {
    const workOrder = await this.workOrders.findById(organizationId, workOrderId);
    if (!workOrder) {
      throw new NotFoundError('Work order');
    }
    const items = await this.payments.findByWorkOrder(organizationId, workOrderId);
    const balance =
      workOrder.totalPriceMinor !== undefined && workOrder.currency
        ? {
            currency: workOrder.currency,
            totalMinor: workOrder.totalPriceMinor,
            ...computeBalance(workOrder.totalPriceMinor, items),
          }
        : null;
    return { items, balance };
  }

  async record(
    organizationId: string,
    workOrderId: string,
    input: RecordPaymentInput,
    actor: PaymentActor,
  ): Promise<Payment> {
    const notes = input.notes?.trim();
    const fieldErrors: Record<string, string> = {};
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      fieldErrors.amountMinor = 'amountMinor must be a positive integer';
    }
    if (typeof input.paymentDate !== 'string' || !isIsoDate(input.paymentDate)) {
      fieldErrors.paymentDate = 'paymentDate must be a valid YYYY-MM-DD date';
    }
    if (!PAYMENT_METHODS.includes(input.method as PaymentMethod)) {
      fieldErrors.method = `method must be one of: ${PAYMENT_METHODS.join(', ')}`;
    }
    if (notes && notes.length > MAX_TEXT_LENGTH) {
      fieldErrors.notes = `notes must be at most ${MAX_TEXT_LENGTH} characters`;
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('Invalid payment', fieldErrors);
    }

    return this.payments.record(
      organizationId,
      workOrderId,
      {
        amountMinor: input.amountMinor,
        paymentDate: input.paymentDate,
        method: input.method,
        ...(notes && { notes }),
      },
      actor,
    );
  }

  async voidPayment(
    organizationId: string,
    workOrderId: string,
    paymentId: string,
    reason: string,
    actor: PaymentActor,
  ): Promise<Payment> {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
      throw new ValidationError('Invalid void reason', {
        reason: trimmed
          ? `reason must be at most ${MAX_TEXT_LENGTH} characters`
          : 'reason should not be empty',
      });
    }
    return this.payments.voidPayment(organizationId, workOrderId, paymentId, trimmed, actor);
  }
}
