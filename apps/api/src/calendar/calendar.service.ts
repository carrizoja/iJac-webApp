import { Injectable, Inject } from '@nestjs/common';
import { WorkOrderRepository } from '../work-orders/work-order.repository';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { CalendarEvent } from '@ijac/shared';

@Injectable()
export class CalendarService {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrderRepository: WorkOrderRepository,
  ) {}

  async findEventsInRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<CalendarEvent[]> {
    const workOrders = await this.workOrderRepository.findByDueDateRange(
      organizationId,
      from,
      to,
    );
    return workOrders.map((wo) => ({
      id: wo.id,
      workOrderId: wo.id,
      title: wo.title,
      dueDate: wo.dueDate as string,
      status: wo.status,
      priority: wo.priority,
    }));
  }
}
