import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  Currency,
  formatMoney,
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
    const paymentRef = paymentsRef.doc();
    const counterRef = this.counterRef(organizationId);
    const profileRef = this.profileRef(organizationId);

    return this.firestore.runTransaction(async (tx) => {
      // All reads happen before any write.
      const workOrder = await tx.get(workOrderRef);
      if (!workOrder.exists) {
        throw new NotFoundError('Work order');
      }
      if (workOrder.get('status') === WorkOrderStatus.CANCELLED) {
        throw new ConflictError('Cannot record a payment on a cancelled work order');
      }
      const totalMinor = workOrder.get('totalPriceMinor') as number | undefined;
      const currency = workOrder.get('currency') as Currency | undefined;
      if (totalMinor === undefined || !currency) {
        throw new ConflictError('Set a total price on the work order before recording payments');
      }

      const profileDoc = await tx.get(profileRef);
      const profile = profileDoc.exists
        ? (profileDoc.get('profile') as PaymentIssuerSnapshot | undefined)
        : undefined;
      if (!profile) {
        throw new ConflictError('Complete the organization profile before recording payments');
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
        throw new ConflictError('Payment is already voided');
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
