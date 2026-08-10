import { WorkOrder, WorkOrderClientSummary, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';
import {
  WorkOrderRepository,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderFilter,
} from './work-order.repository';
import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FIRESTORE } from '../firebase/firebase.module';
import { ApiEnvironment } from '../config/env';
import { toIsoString, toTimestamp, nowTimestamp } from '../common/timestamps';
import { NotFoundError, ValidationError } from '../common/errors';

@Injectable()
export class FirestoreWorkOrderRepository implements WorkOrderRepository {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  private collection(organizationId: string) {
    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return this.firestore.collection('workOrders');
    }

    return this.firestore
      .collection('organizations')
      .doc(organizationId)
      .collection('workOrders');
  }

  private clientsCollection(organizationId: string) {
    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return this.firestore.collection('clients');
    }

    return this.firestore
      .collection('organizations')
      .doc(organizationId)
      .collection('clients');
  }

  private toWorkOrder(doc: FirebaseFirestore.DocumentSnapshot): WorkOrder {
    const data = doc.data() as Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'dueDate'> & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
      dueDate?: Timestamp | null;
    };
    return {
      ...data,
      id: doc.id,
      createdAt: toIsoString(data.createdAt) ?? '',
      updatedAt: toIsoString(data.updatedAt) ?? '',
      dueDate: toIsoString(data.dueDate ?? undefined),
    };
  }

  private validateStatusPriority(status: string, priority: string) {
    if (!Object.values(WorkOrderStatus).includes(status as WorkOrderStatus)) {
      throw new ValidationError('Invalid work order status');
    }
    if (!Object.values(WorkOrderPriority).includes(priority as WorkOrderPriority)) {
      throw new ValidationError('Invalid work order priority');
    }
  }

  async create(
    organizationId: string,
    input: CreateWorkOrderInput,
  ): Promise<WorkOrder> {
    this.validateStatusPriority(input.status, input.priority);
    const clientRef = this.clientsCollection(organizationId).doc(input.clientId);
    const now = nowTimestamp();
    const ref = this.collection(organizationId).doc();
    const workOrder = {
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status: input.status,
      priority: input.priority,
      clientId: input.clientId,
      dueDate: toTimestamp(input.dueDate) ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore.runTransaction(async (tx) => {
      const clientDoc = await tx.get(clientRef);
      if (!clientDoc.exists) {
        throw new NotFoundError('Client');
      }
      tx.create(ref, workOrder);
      tx.update(clientRef, {
        workOrderCount: FieldValue.increment(1),
        updatedAt: now,
      });
    });

    return this.toWorkOrder(await ref.get());
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateWorkOrderInput,
  ): Promise<WorkOrder> {
    if (input.status !== undefined && input.priority !== undefined) {
      this.validateStatusPriority(input.status, input.priority);
    } else if (input.status !== undefined) {
      this.validateStatusPriority(input.status, 'normal');
    } else if (input.priority !== undefined) {
      this.validateStatusPriority('open', input.priority);
    }

    const ref = this.collection(organizationId).doc(id);
    const clientRef = input.clientId
      ? this.clientsCollection(organizationId).doc(input.clientId)
      : null;
    const now = nowTimestamp();
    const update: Record<string, unknown> = { updatedAt: now };
    if (input.title !== undefined) update.title = input.title.trim();
    if (input.description !== undefined)
      update.description = input.description.trim();
    if (input.status !== undefined) update.status = input.status;
    if (input.priority !== undefined) update.priority = input.priority;
    if (input.dueDate !== undefined)
      update.dueDate = input.dueDate ? toTimestamp(input.dueDate) : null;

    await this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new NotFoundError('Work order');
      }
      const previousClientId = doc.get('clientId') as string;
      if (input.clientId !== undefined && input.clientId !== previousClientId) {
        if (!clientRef) {
          throw new NotFoundError('Client');
        }
        const newClient = await tx.get(clientRef);
        if (!newClient.exists) {
          throw new NotFoundError('Client');
        }
        update.clientId = input.clientId;
        tx.update(
          this.clientsCollection(organizationId).doc(previousClientId),
          {
            workOrderCount: FieldValue.increment(-1),
            updatedAt: now,
          },
        );
        tx.update(clientRef, {
          workOrderCount: FieldValue.increment(1),
          updatedAt: now,
        });
      }
      tx.update(ref, update);
    });

    return this.toWorkOrder(await ref.get());
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const ref = this.collection(organizationId).doc(id);
    await this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new NotFoundError('Work order');
      }
      const clientId = doc.get('clientId') as string;
      tx.update(this.clientsCollection(organizationId).doc(clientId), {
        workOrderCount: FieldValue.increment(-1),
        updatedAt: nowTimestamp(),
      });
      tx.delete(ref);
    });
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<WorkOrder | null> {
    const doc = await this.collection(organizationId).doc(id).get();
    if (!doc.exists) return null;
    return this.toWorkOrder(doc);
  }

  async findMany(
    organizationId: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }> {
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    let query: FirebaseFirestore.Query = this.collection(organizationId)
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (filter.status) query = query.where('status', '==', filter.status);
    if (filter.priority)
      query = query.where('priority', '==', filter.priority);
    if (filter.clientId)
      query = query.where('clientId', '==', filter.clientId);
    if (filter.dueDateFrom) {
      query = query.where('dueDate', '>=', toTimestamp(filter.dueDateFrom));
    }
    if (filter.dueDateTo) {
      query = query.where('dueDate', '<=', toTimestamp(filter.dueDateTo));
    }

    if (filter.cursor) {
      const cursorDoc = await this.collection(organizationId)
        .doc(filter.cursor)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const clientIds = new Set(
      snapshot.docs.map((doc) => doc.get('clientId') as string),
    );
    const clients = new Map<string, { name: string }>();
    if (clientIds.size > 0) {
      const clientDocs = await this.firestore.getAll(
        ...Array.from(clientIds).map((id) =>
          this.clientsCollection(organizationId).doc(id),
        ),
      );
      for (const clientDoc of clientDocs) {
        if (clientDoc.exists) {
          clients.set(clientDoc.id, {
            name: clientDoc.get('name') as string,
          });
        }
      }
    }

    const items = snapshot.docs.map((doc) => {
      const order = this.toWorkOrder(doc);
      const client = clients.get(order.clientId);
      return {
        id: order.id,
        clientId: order.clientId,
        clientName: client?.name ?? 'Unknown',
        title: order.title,
        status: order.status,
        priority: order.priority,
        dueDate: order.dueDate,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });
    const nextCursor =
      snapshot.docs.length === limit
        ? snapshot.docs[snapshot.docs.length - 1].id
        : undefined;
    return { items, nextCursor };
  }

  async findByDueDateRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<WorkOrderClientSummary[]> {
    const snapshot = await this.collection(organizationId)
      .where('status', '!=', 'cancelled')
      .where('dueDate', '>=', toTimestamp(from))
      .where('dueDate', '<=', toTimestamp(to))
      .orderBy('dueDate', 'asc')
      .get();

    const clientIds = new Set(
      snapshot.docs.map((doc) => doc.get('clientId') as string),
    );
    const clients = new Map<string, { name: string }>();
    if (clientIds.size > 0) {
      const clientDocs = await this.firestore.getAll(
        ...Array.from(clientIds).map((id) =>
          this.clientsCollection(organizationId).doc(id),
        ),
      );
      for (const clientDoc of clientDocs) {
        if (clientDoc.exists) {
          clients.set(clientDoc.id, {
            name: clientDoc.get('name') as string,
          });
        }
      }
    }

    return snapshot.docs.map((doc) => {
      const order = this.toWorkOrder(doc);
      const client = clients.get(order.clientId);
      return {
        id: order.id,
        clientId: order.clientId,
        clientName: client?.name ?? 'Unknown',
        title: order.title,
        status: order.status,
        priority: order.priority,
        dueDate: order.dueDate,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });
  }
}
