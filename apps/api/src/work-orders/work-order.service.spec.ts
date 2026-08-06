import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderService } from './work-order.service';
import {
  WorkOrderRepository,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderFilter,
} from './work-order.repository';
import { WorkOrder, WorkOrderClientSummary, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';
import { NotFoundError, ValidationError } from '../common/errors';
import { WORK_ORDER_REPOSITORY } from './work-order.constants';

class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private workOrders: Map<string, WorkOrder> = new Map();
  private clientIds = new Set<string>();
  private counter = 0;

  addClient(clientId: string) {
    this.clientIds.add(clientId);
  }

  async create(_uid: string, input: CreateWorkOrderInput): Promise<WorkOrder> {
    if (!this.clientIds.has(input.clientId)) {
      throw new NotFoundError('Client');
    }
    this.counter += 1;
    const workOrder: WorkOrder = {
      id: `wo-${this.counter}`,
      title: input.title,
      description: input.description ?? '',
      status: input.status as WorkOrderStatus,
      priority: input.priority as WorkOrderPriority,
      clientId: input.clientId,
      dueDate: input.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workOrders.set(workOrder.id, workOrder);
    return workOrder;
  }

  async update(_uid: string, id: string, input: UpdateWorkOrderInput): Promise<WorkOrder> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder) throw new NotFoundError('Work order');
    if (input.clientId && !this.clientIds.has(input.clientId)) {
      throw new NotFoundError('Client');
    }
    const updated: WorkOrder = {
      ...workOrder,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status as WorkOrderStatus }),
      ...(input.priority !== undefined && { priority: input.priority as WorkOrderPriority }),
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate ?? undefined }),
      updatedAt: new Date().toISOString(),
    };
    this.workOrders.set(id, updated);
    return updated;
  }

  async delete(_uid: string, id: string): Promise<void> {
    const exists = this.workOrders.delete(id);
    if (!exists) throw new NotFoundError('Work order');
  }

  async findById(_uid: string, id: string): Promise<WorkOrder | null> {
    return this.workOrders.get(id) ?? null;
  }

  async findMany(_uid: string,
    filter: WorkOrderFilter,
  ): Promise<{ items: WorkOrderClientSummary[]; nextCursor?: string }> {
    let items = Array.from(this.workOrders.values()).map((wo) => ({
      ...wo,
      clientName: 'Client',
    }));
    if (filter.status) {
      items = items.filter((wo) => wo.status === filter.status);
    }
    if (filter.priority) {
      items = items.filter((wo) => wo.priority === filter.priority);
    }
    if (filter.clientId) {
      items = items.filter((wo) => wo.clientId === filter.clientId);
    }
    return { items };
  }

  async findByDueDateRange(_uid: string,
    from: string,
    to: string,
  ): Promise<WorkOrderClientSummary[]> {
    return Array.from(this.workOrders.values())
      .filter((wo) => wo.dueDate && wo.dueDate >= from && wo.dueDate <= to && wo.status !== 'cancelled')
      .map((wo) => ({ ...wo, clientName: 'Client' }));
  }
}

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let repository: InMemoryWorkOrderRepository;

  beforeEach(async () => {
    repository = new InMemoryWorkOrderRepository();
    repository.addClient('client-a');
    repository.addClient('client-b');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        {
          provide: WORK_ORDER_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();
    service = module.get(WorkOrderService);
  });

  it('creates a work order for an existing client', async () => {
    const wo = await service.create('uid', {
      title: 'Setup',
      status: 'open',
      priority: 'normal',
      clientId: 'client-a',
    });
    expect(wo.title).toBe('Setup');
    expect(wo.clientId).toBe('client-a');
  });

  it('rejects a work order for an unknown client', async () => {
    await expect(
      service.create('uid', {
        title: 'Setup',
        status: 'open',
        priority: 'normal',
        clientId: 'unknown',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects invalid status', async () => {
    await expect(
      service.create('uid', {
        title: 'Setup',
        status: 'invalid' as WorkOrderStatus,
        priority: 'normal',
        clientId: 'client-a',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('updates client assignment', async () => {
    const wo = await service.create('uid', {
      title: 'Setup',
      status: 'open',
      priority: 'normal',
      clientId: 'client-a',
    });
    const updated = await service.update('uid', wo.id, { clientId: 'client-b' });
    expect(updated.clientId).toBe('client-b');
    expect(updated.createdAt).toBe(wo.createdAt);
  });

  it('filters by status', async () => {
    await service.create('uid', { title: 'A', status: 'open', priority: 'normal', clientId: 'client-a' });
    await service.create('uid', { title: 'B', status: 'completed', priority: 'normal', clientId: 'client-a' });
    const result = await service.findMany('uid', { status: 'completed' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('B');
  });

  it('deletes a work order', async () => {
    const wo = await service.create('uid', { title: 'A', status: 'open', priority: 'normal', clientId: 'client-a' });
    await service.delete('uid', wo.id);
    const found = await service.findById('uid', wo.id);
    expect(found).toBeNull();
  });
});
