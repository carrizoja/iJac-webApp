import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  WorkOrderRepository,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderFilter,
} from './work-order.repository';
import { CURRENCIES, Currency, WorkOrder, WorkOrderClientSummary } from '@ijac/shared';
import { WORK_ORDER_REPOSITORY } from './work-order.constants';
import { ValidationError } from '../common/errors';
import { CalendarSyncService } from '../calendar/calendar-sync.service';

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);

  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repository: WorkOrderRepository,
    private readonly calendarSync: CalendarSyncService,
  ) {}

  async create(organizationId: string, input: CreateWorkOrderInput): Promise<WorkOrder> {
    this.validateWorkOrderInput(input);
    const { totalPriceMinor, ...rest } = input;
    this.validatePricing(totalPriceMinor, input.currency, 'create');
    return this.repository.create(organizationId, {
      ...rest,
      ...(totalPriceMinor != null && { totalPriceMinor }),
    });
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateWorkOrderInput,
  ): Promise<WorkOrder> {
    this.validateWorkOrderInput(input);
    this.validatePricing(input.totalPriceMinor, input.currency, 'update');
    return this.repository.update(organizationId, id, input);
  }

  private validateWorkOrderInput(input: CreateWorkOrderInput | UpdateWorkOrderInput): void {
    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (input.status !== undefined && !validStatuses.includes(input.status as string)) {
      throw new ValidationError(`Invalid work order status: ${input.status}`);
    }
    if (input.priority !== undefined && !validPriorities.includes(input.priority as string)) {
      throw new ValidationError(`Invalid work order priority: ${input.priority}`);
    }
  }

  /**
   * Stateless price/currency rules. Rules that depend on the stored order
   * (price without any currency, currency without a stored price) are enforced
   * by the repository inside its transaction.
   */
  private validatePricing(
    totalPriceMinor: number | null | undefined,
    currency: string | undefined,
    mode: 'create' | 'update',
  ): void {
    const fieldErrors: Record<string, string> = {};
    const hasPrice = typeof totalPriceMinor === 'number';
    if (hasPrice && !(Number.isSafeInteger(totalPriceMinor) && totalPriceMinor >= 0)) {
      fieldErrors.totalPriceMinor = 'totalPriceMinor must be a non-negative integer';
    }
    if (currency !== undefined && !CURRENCIES.includes(currency as Currency)) {
      fieldErrors.currency = 'currency must be ARS or USD';
    }
    if (!fieldErrors.currency && currency !== undefined && !hasPrice) {
      // On update a bare currency is checked against the stored price by the
      // repository; a null price clears the order, so a currency contradicts it.
      if (mode === 'create' || totalPriceMinor === null) {
        fieldErrors.totalPriceMinor = 'totalPriceMinor is required when currency is set';
      }
    }
    if (
      !fieldErrors.currency &&
      !fieldErrors.totalPriceMinor &&
      mode === 'create' &&
      hasPrice &&
      currency === undefined
    ) {
      fieldErrors.currency = 'currency is required when totalPriceMinor is set';
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('Invalid work order', fieldErrors);
    }
  }

  /**
   * Deletes the work order, then removes its Google Calendar event using the
   * caller's connection. A calendar failure never undoes or fails the deletion.
   */
  async delete(organizationId: string, id: string, uid: string): Promise<void> {
    await this.repository.delete(organizationId, id);
    try {
      const result = await this.calendarSync.deleteWorkOrder(uid, organizationId, id);
      if (!result.success) {
        this.logger.warn(
          `Google Calendar event of deleted work order ${id} was not removed: ${result.mapping.status}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Google Calendar cleanup for deleted work order ${id} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findById(organizationId: string, id: string): Promise<WorkOrder | null> {
    return this.repository.findById(organizationId, id);
  }

  async findMany(
    organizationId: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }> {
    return this.repository.findMany(organizationId, filter);
  }
}
