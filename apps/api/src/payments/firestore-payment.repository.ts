import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  Currency,
  formatMoney,
  PAYMENT_ERROR_CODES,
  computeBalance,
  Payment,
  PaymentActor,
  PaymentClientSnapshot,
  PaymentConcept,
  PaymentIssuerSnapshot,
  PaymentMethod,
  PaymentStatus,
  RecordPaymentInput,
  WorkOrderStatus,
} from '@ijac/shared';
import { FIRESTORE } from '../firebase/firebase.module';
import { ApiEnvironment } from '../config/env';
import { nowTimestamp, toIsoString } from '../common/timestamps';
import { ConflictError, NotFoundError, ValidationError } from '../common/errors';
import { PaymentRepository } from './payment.repository';

type StoredPayment = Omit<Payment, 'id' | 'createdAt' | 'void'> & {
  createdAt: Timestamp;
  void?: { reason: string; voidedBy: PaymentActor; voidedAt: Timestamp };
};

@Injectable()
export class FirestorePaymentRepository implements PaymentRepository {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  private isGlobal(): boolean {
    return (this.config.get('REPOSITORY_MODE') ?? 'global') === 'global';
  }

  /** Root of organization-scoped data: the Firestore root in global mode. */
  private scope(organizationId: string) {
    return this.isGlobal() ? null : this.firestore.collection('organizations').doc(organizationId);
  }

  private collection(organizationId: string, name: string) {
    return this.scope(organizationId)?.collection(name) ?? this.firestore.collection(name);
  }

  /**
   * The receipt counter is one document per organization. In global mode every
   * owner shares the single root `counters/receipts` document.
   */
  private counterRef(organizationId: string) {
    return this.collection(organizationId, 'counters').doc('receipts');
  }

  /** Mirrors the organization-profile repository's document resolution. */
  private profileRef(organizationId: string) {
    return this.isGlobal()
      ? this.firestore.collection('settings').doc('organization')
      : this.firestore.collection('organizations').doc(organizationId);
  }

  private paymentsCollection(organizationId: string, workOrderId: string) {
    return this.collection(organizationId, 'workOrders').doc(workOrderId).collection('payments');
  }

  /** Registry of idempotency keys; maps a key to the work order it was first used on. */
  private keyRef(organizationId: string, key: string) {
    return this.collection(organizationId, 'paymentKeys').doc(key);
  }

  private toPayment(id: string, workOrderId: string, stored: StoredPayment): Payment {
    const { createdAt, void: voidData, ...rest } = stored;
    return {
      ...rest,
      id,
      workOrderId,
      createdAt: toIsoString(createdAt) ?? '',
      ...(voidData && {
        void: {
          reason: voidData.reason,
          voidedBy: voidData.voidedBy,
          voidedAt: toIsoString(voidData.voidedAt) ?? '',
        },
      }),
    };
  }

  /** Compares the replayed request with the stored payment; notes are compared as recorded (trimmed, empty equals absent). */
  private isSamePayload(stored: StoredPayment, input: RecordPaymentInput): boolean {
    return (
      stored.amountMinor === input.amountMinor &&
      stored.paymentDate === input.paymentDate &&
      stored.method === input.method &&
      (stored.notes ?? '') === (input.notes?.trim() ?? '')
    );
  }

  async findByWorkOrder(organizationId: string, workOrderId: string): Promise<Payment[]> {
    const snapshot = await this.paymentsCollection(organizationId, workOrderId).get();
    return snapshot.docs
      .map((doc) => this.toPayment(doc.id, workOrderId, doc.data() as StoredPayment))
      .sort((a, b) => a.receiptNumber - b.receiptNumber);
  }

  async record(
    organizationId: string,
    workOrderId: string,
    input: RecordPaymentInput,
    actor: PaymentActor,
  ): Promise<Payment> {
    const workOrderRef = this.collection(organizationId, 'workOrders').doc(workOrderId);
    const paymentsRef = this.paymentsCollection(organizationId, workOrderId);
    const key = input.idempotencyKey;
    const paymentRef = key ? paymentsRef.doc(key) : paymentsRef.doc();
    const keyRef = key ? this.keyRef(organizationId, key) : null;
    const counterRef = this.counterRef(organizationId);
    const profileRef = this.profileRef(organizationId);

    return this.firestore.runTransaction(async (tx) => {
      // All reads happen before any write.
      if (keyRef) {
        const keyDoc = await tx.get(keyRef);
        if (keyDoc.exists) {
          if (keyDoc.get('workOrderId') !== workOrderId) {
            throw new ConflictError(
              'Idempotency key was already used for another work order',
              PAYMENT_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT,
            );
          }
          const original = await tx.get(paymentRef);
          if (original.exists) {
            const stored = original.data() as StoredPayment;
            if (!this.isSamePayload(stored, input)) {
              throw new ConflictError(
                'Idempotency key was already used with a different payment',
                PAYMENT_ERROR_CODES.IDEMPOTENCY_KEY_CONFLICT,
              );
            }
            return this.toPayment(paymentRef.id, workOrderId, stored);
          }
        }
      }
      const workOrder = await tx.get(workOrderRef);
      if (!workOrder.exists) {
        throw new NotFoundError('Work order');
      }
      if (workOrder.get('status') === WorkOrderStatus.CANCELLED) {
        throw new ConflictError(
          'Cannot record a payment on a cancelled work order',
          PAYMENT_ERROR_CODES.WORK_ORDER_CANCELLED,
        );
      }
      const totalMinor = workOrder.get('totalPriceMinor') as number | undefined;
      const currency = workOrder.get('currency') as Currency | undefined;
      if (totalMinor === undefined || !currency) {
        throw new ConflictError(
          'Set a total price on the work order before recording payments',
          PAYMENT_ERROR_CODES.WORK_ORDER_NOT_PRICED,
        );
      }

      const profileDoc = await tx.get(profileRef);
      const profile = profileDoc.exists
        ? (profileDoc.get('profile') as PaymentIssuerSnapshot | undefined)
        : undefined;
      if (!profile) {
        throw new ConflictError(
          'Complete the organization profile before recording payments',
          PAYMENT_ERROR_CODES.ORGANIZATION_PROFILE_NOT_CONFIGURED,
        );
      }

      const clientDoc = await tx.get(
        this.collection(organizationId, 'clients').doc(workOrder.get('clientId') as string),
      );
      if (!clientDoc.exists) {
        throw new NotFoundError('Client');
      }

      const paymentDocs = await tx.get(paymentsRef);
      const counterDoc = await tx.get(counterRef);

      const existing = paymentDocs.docs.map((doc) => doc.data() as StoredPayment);
      const { remainingMinor } = computeBalance(totalMinor, existing);
      if (input.amountMinor > remainingMinor) {
        throw new ValidationError(
          `Amount exceeds the remaining balance of ${formatMoney(remainingMinor, currency)}`,
          {
            amountMinor: `amountMinor must not exceed the remaining balance of ${formatMoney(remainingMinor, currency)}`,
          },
          PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_BALANCE,
        );
      }

      const receiptNumber = (counterDoc.get('next') as number | undefined) ?? 1;
      const taxId = clientDoc.get('taxId') as string | undefined;
      const client: PaymentClientSnapshot = {
        name: clientDoc.get('name') as string,
        ...(taxId && { taxId }),
      };
      const notes = input.notes?.trim();
      const stored: StoredPayment = {
        workOrderId,
        receiptNumber,
        amountMinor: input.amountMinor,
        currency,
        paymentDate: input.paymentDate,
        method: input.method as PaymentMethod,
        ...(notes && { notes }),
        status: PaymentStatus.ACTIVE,
        concept:
          remainingMinor - input.amountMinor === 0
            ? PaymentConcept.BALANCE_SETTLEMENT
            : PaymentConcept.ADVANCE,
        issuer: {
          businessName: profile.businessName,
          cuit: profile.cuit,
          address: profile.address,
          phone: profile.phone,
        },
        client,
        workOrderTitle: workOrder.get('title') as string,
        recordedBy: actor,
        createdAt: nowTimestamp(),
      };

      tx.set(counterRef, { next: receiptNumber + 1 });
      tx.create(paymentRef, stored);
      if (keyRef) tx.set(keyRef, { workOrderId, paymentId: paymentRef.id });
      return this.toPayment(paymentRef.id, workOrderId, stored);
    });
  }

  async voidPayment(
    organizationId: string,
    workOrderId: string,
    paymentId: string,
    reason: string,
    actor: PaymentActor,
  ): Promise<Payment> {
    const paymentRef = this.paymentsCollection(organizationId, workOrderId).doc(paymentId);

    return this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(paymentRef);
      if (!doc.exists) {
        throw new NotFoundError('Payment');
      }
      const stored = doc.data() as StoredPayment;
      if (stored.status === PaymentStatus.VOIDED) {
        throw new ConflictError(
          'Payment is already voided',
          PAYMENT_ERROR_CODES.PAYMENT_ALREADY_VOIDED,
        );
      }

      const voided: StoredPayment = {
        ...stored,
        status: PaymentStatus.VOIDED,
        void: { reason, voidedBy: actor, voidedAt: nowTimestamp() },
      };
      tx.update(paymentRef, { status: voided.status, void: voided.void });
      return this.toPayment(paymentId, workOrderId, voided);
    });
  }
}
