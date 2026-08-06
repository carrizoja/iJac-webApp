import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { WorkOrderRepository } from '../work-orders/work-order.repository';
import { WorkOrderClientSummary, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private workOrders: WorkOrderClientSummary[] = [];

  add(wo: WorkOrderClientSummary) {
    this.workOrders.push(wo);
  }

  async findByDueDateRange(_uid: string,
    from: string,
    to: string,
  ): Promise<WorkOrderClientSummary[]> {
    return this.workOrders.filter(
      (wo) =>
        wo.dueDate &&
        wo.dueDate >= from &&
        wo.dueDate <= to &&
        wo.status !== 'cancelled',
    );
  }

  async create(): Promise<import('@ijac/shared').WorkOrder> {
    throw new Error('not needed');
  }
  async update(): Promise<import('@ijac/shared').WorkOrder> {
    throw new Error('not needed');
  }
  async delete(): Promise<void> {
    throw new Error('not needed');
  }
  async findById(): Promise<import('@ijac/shared').WorkOrder | null> {
    throw new Error('not needed');
  }
  async findMany(): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }> {
    throw new Error('not needed');
  }
}

describe('CalendarService', () => {
  let service: CalendarService;
  let repository: InMemoryWorkOrderRepository;

  beforeEach(async () => {
    repository = new InMemoryWorkOrderRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: WORK_ORDER_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();
    service = module.get(CalendarService);
  });

  it('returns only due-dated non-cancelled work orders in range', async () => {
    repository.add({
      id: '1',
      clientId: 'c1',
      clientName: 'A',
      title: 'In range',
      status: 'open' as WorkOrderStatus,
      priority: 'normal' as WorkOrderPriority,
      dueDate: '2026-07-15T00:00:00.000Z',
      createdAt: '',
      updatedAt: '',
    });
    repository.add({
      id: '2',
      clientId: 'c1',
      clientName: 'A',
      title: 'Cancelled',
      status: 'cancelled' as WorkOrderStatus,
      priority: 'normal' as WorkOrderPriority,
      dueDate: '2026-07-15T00:00:00.000Z',
      createdAt: '',
      updatedAt: '',
    });
    repository.add({
      id: '3',
      clientId: 'c1',
      clientName: 'A',
      title: 'No date',
      status: 'open' as WorkOrderStatus,
      priority: 'normal' as WorkOrderPriority,
      createdAt: '',
      updatedAt: '',
    });
    const events = await service.findEventsInRange('uid', '2026-07-01', '2026-07-31');
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('In range');
  });
});
