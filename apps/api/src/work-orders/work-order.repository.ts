import { WorkOrder, WorkOrderClientSummary } from '@ijac/shared';

export interface CreateWorkOrderInput {
  title: string;
  description?: string;
  status: string;
  priority: string;
  clientId: string;
  dueDate?: string;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  dueDate?: string | null;
}

export interface WorkOrderFilter {
  status?: string;
  priority?: string;
  clientId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface WorkOrderRepository {
  create(uid: string, input: CreateWorkOrderInput): Promise<WorkOrder>;
  update(uid: string, id: string, input: UpdateWorkOrderInput): Promise<WorkOrder>;
  delete(uid: string, id: string): Promise<void>;
  findById(uid: string, id: string): Promise<WorkOrder | null>;
  findMany(
    uid: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }>;
  findByDueDateRange(
    uid: string,
    from: string,
    to: string,
  ): Promise<WorkOrderClientSummary[]>;
}
