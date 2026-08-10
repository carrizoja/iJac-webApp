import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { calendar_v3 } from 'googleapis';
import { CalendarSyncService } from './calendar-sync.service';
import { CalendarConnectionRepository, CalendarConnection } from './connection.repository';
import { CalendarEventMappingRepository } from './event-mapping.repository';
import { CALENDAR_CONNECTION_REPOSITORY, CALENDAR_EVENT_MAPPING_REPOSITORY } from './calendar-connection.constants';

class InMemoryConnectionRepository implements CalendarConnectionRepository {
  private connections: Map<string, CalendarConnection> = new Map();

  async save(connection: CalendarConnection): Promise<void> {
    this.connections.set(connection.uid, connection);
  }

  async findByUid(uid: string): Promise<CalendarConnection | null> {
    return this.connections.get(uid) ?? null;
  }

  async updateStatus(): Promise<void> {}
}

class InMemoryMappingRepository implements CalendarEventMappingRepository {
  private mappings: Map<
    string,
    import('./event-mapping.repository').CalendarEventMapping
  > = new Map();

  async upsert(
    _organizationId: string,
    mapping: import('./event-mapping.repository').CalendarEventMapping,
  ): Promise<void> {
    this.mappings.set(mapping.id, mapping);
  }

  async findByWorkOrderId(
    _organizationId: string,
    workOrderId: string,
  ): Promise<import('./event-mapping.repository').CalendarEventMapping | null> {
    return this.mappings.get(workOrderId) ?? null;
  }

  async deleteByWorkOrderId(
    _organizationId: string,
    workOrderId: string,
  ): Promise<void> {
    this.mappings.delete(workOrderId);
  }
}

interface MockedEvents {
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

function createMockCalendarClient(): calendar_v3.Calendar {
  const events: MockedEvents = {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return { events } as unknown as calendar_v3.Calendar;
}

describe('CalendarSyncService', () => {
  let service: CalendarSyncService;
  let connectionRepo: InMemoryConnectionRepository;
  let mappingRepo: InMemoryMappingRepository;
  let mockClient: calendar_v3.Calendar;

  beforeEach(async () => {
    connectionRepo = new InMemoryConnectionRepository();
    mappingRepo = new InMemoryMappingRepository();
    mockClient = createMockCalendarClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
              };
              return values[key];
            },
          },
        },
        {
          provide: CALENDAR_CONNECTION_REPOSITORY,
          useValue: connectionRepo,
        },
        {
          provide: CALENDAR_EVENT_MAPPING_REPOSITORY,
          useValue: mappingRepo,
        },
      ],
    }).compile();
    service = module.get(CalendarSyncService);
    jest.spyOn(service as any, 'getClient').mockResolvedValue({ client: mockClient, accountEmail: 'test@example.com' });
  });

  it('returns null client when no connection exists', async () => {
    jest.restoreAllMocks();
    const client = await service.getClient('uid-1');
    expect(client).toBeNull();
  });

  it('creates a Google event when no mapping exists', async () => {
    const events = mockClient.events as unknown as MockedEvents;
    events.insert.mockResolvedValue({ data: { id: 'google-event-1' } });

    const result = await service.syncWorkOrder('uid-1', 'org-1', {
      id: 'wo-1',
      title: 'Work order',
      status: 'open',
      dueDate: '2026-07-28T12:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(events.insert).toHaveBeenCalled();
    const mapping = await mappingRepo.findByWorkOrderId('org-1', 'wo-1');
    expect(mapping?.googleEventId).toBe('google-event-1');
    expect(mapping?.status).toBe('synced');
  });

  it('updates a Google event when mapping exists', async () => {
    const events = mockClient.events as unknown as MockedEvents;
    events.insert.mockResolvedValue({ data: { id: 'google-event-1' } });
    await service.syncWorkOrder('uid-1', 'org-1', {
      id: 'wo-1',
      title: 'Work order',
      status: 'open',
    });

    events.update.mockResolvedValue({ data: { id: 'google-event-1' } });
    const result = await service.syncWorkOrder('uid-1', 'org-1', {
      id: 'wo-1',
      title: 'Work order updated',
      status: 'in-progress',
    });

    expect(result.success).toBe(true);
    expect(events.update).toHaveBeenCalled();
  });

  it('marks mapping as failed when Google API returns an error', async () => {
    jest.restoreAllMocks();
    const events = mockClient.events as unknown as MockedEvents;
    events.insert.mockRejectedValue(new Error('API error'));
    jest
      .spyOn(service as any, 'getClient')
      .mockResolvedValue({
        client: mockClient,
        accountEmail: 'test@example.com',
      });

    const result = await service.syncWorkOrder('uid-1', 'org-1', {
      id: 'wo-1',
      title: 'Work order',
      status: 'open',
    });

    expect(result.success).toBe(false);
    expect(result.mapping.status).toBe('failed');
    expect(result.mapping.errorMessage).toContain('API error');
  });

  it('deletes a mapped Google event', async () => {
    const events = mockClient.events as unknown as MockedEvents;
    events.insert.mockResolvedValue({ data: { id: 'google-event-1' } });
    await service.syncWorkOrder('uid-1', 'org-1', {
      id: 'wo-1',
      title: 'Work order',
      status: 'open',
    });

    events.delete.mockResolvedValue({});
    const result = await service.deleteWorkOrder('uid-1', 'org-1', 'wo-1');

    expect(result.success).toBe(true);
    expect(events.delete).toHaveBeenCalled();
    const mapping = await mappingRepo.findByWorkOrderId('org-1', 'wo-1');
    expect(mapping).toBeNull();
  });
});
