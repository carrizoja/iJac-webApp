import { Payment, PaymentActor, RecordPaymentInput } from '@ijac/shared';

export interface PaymentRepository {
  /** All payments of a work order (active and voided), ordered by receipt number. */
  findByWorkOrder(organizationId: string, workOrderId: string): Promise<Payment[]>;
  /**
   * Every payment of the organization (active and voided) whose payment date is `paymentDate`,
   * across its work orders, ordered by receipt number.
   */
  findByPaymentDate(organizationId: string, paymentDate: string): Promise<Payment[]>;
  /**
   * Records a payment in one transaction: validates preconditions, assigns the
   * next receipt number and stores the issuance-time snapshots.
   */
  record(
    organizationId: string,
    workOrderId: string,
    input: RecordPaymentInput,
    actor: PaymentActor,
  ): Promise<Payment>;
  /** Voids an active payment. Never releases the receipt number. */
  voidPayment(
    organizationId: string,
    workOrderId: string,
    paymentId: string,
    reason: string,
    actor: PaymentActor,
  ): Promise<Payment>;
}
