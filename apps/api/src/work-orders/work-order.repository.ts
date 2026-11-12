import { WorkOrder, WorkOrderClientSummary } from '@ijac/shared';

export interface CreateWorkOrderInput {
  title: string;
  description?: string;
  status: string;
  priority: string;
  clientId: string;
  dueDate?: string;
  totalPriceMinor?: number | null;
  currency?: string;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  clientId?: string;
  dueDate?: string | null;
  /** A number sets the price; `null` clears both price and currency. */
  totalPriceMinor?: number | null;
  currency?: string;
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
  /** Every work order of the organization, oldest first. Used by the data export. */
  listAll(organizationId: string): Promise<WorkOrder[]>;
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
