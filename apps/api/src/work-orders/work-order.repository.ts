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
  create(
    organizationId: string,
    input: CreateWorkOrderInput,
  ): Promise<WorkOrder>;
  update(
    organizationId: string,
    id: string,
    input: UpdateWorkOrderInput,
  ): Promise<WorkOrder>;
  delete(organizationId: string, id: string): Promise<void>;
  findById(organizationId: string, id: string): Promise<WorkOrder | null>;
  findMany(
    organizationId: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }>;
  findByDueDateRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<WorkOrderClientSummary[]>;
}
