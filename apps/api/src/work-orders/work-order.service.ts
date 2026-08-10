import { Injectable, Inject } from '@nestjs/common';
import {
  WorkOrderRepository,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderFilter,
} from './work-order.repository';
import { WorkOrder, WorkOrderClientSummary } from '@ijac/shared';
import { WORK_ORDER_REPOSITORY } from './work-order.constants';
import { ValidationError } from '../common/errors';

@Injectable()
export class WorkOrderService {
  constructor(@Inject(WORK_ORDER_REPOSITORY) private readonly repository: WorkOrderRepository) {}

  async create(
    organizationId: string,
    input: CreateWorkOrderInput,
  ): Promise<WorkOrder> {
    this.validateWorkOrderInput(input);
    return this.repository.create(organizationId, input);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateWorkOrderInput,
  ): Promise<WorkOrder> {
    this.validateWorkOrderInput(input);
    return this.repository.update(organizationId, id, input);
  }

  private validateWorkOrderInput(
    input: CreateWorkOrderInput | UpdateWorkOrderInput,
  ): void {
    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (
      input.status !== undefined &&
      !validStatuses.includes(input.status as string)
    ) {
      throw new ValidationError(`Invalid work order status: ${input.status}`);
    }
    if (
      input.priority !== undefined &&
      !validPriorities.includes(input.priority as string)
    ) {
      throw new ValidationError(
        `Invalid work order priority: ${input.priority}`,
      );
    }
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.repository.delete(organizationId, id);
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<WorkOrder | null> {
    return this.repository.findById(organizationId, id);
  }

  async findMany(
    organizationId: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }> {
    return this.repository.findMany(organizationId, filter);
  }
}
