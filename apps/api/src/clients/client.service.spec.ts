import { Test, TestingModule } from '@nestjs/testing';
import { ClientService } from './client.service';
import { ClientRepository, CreateClientInput, UpdateClientInput, ClientFilter } from './client.repository';
import { Client } from '@ijac/shared';
import { NotFoundError, ConflictError } from '../common/errors';
import { CLIENT_REPOSITORY } from './client.constants';

class InMemoryClientRepository implements ClientRepository {
  private clients: Map<string, Client> = new Map();
  private counter = 0;

  async create(
    _organizationId: string,
    input: CreateClientInput,
  ): Promise<Client> {
    this.counter += 1;
    const client: Client = {
      id: `client-${this.counter}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      organization: input.organization ?? '',
      notes: input.notes ?? '',
      searchPrefixes: [],
      workOrderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.clients.set(client.id, client);
    return client;
  }

  async update(
    _organizationId: string,
    id: string,
    input: UpdateClientInput,
  ): Promise<Client> {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundError('Client');
    const updated: Client = {
      ...client,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.organization !== undefined && {
        organization: input.organization,
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
      updatedAt: new Date().toISOString(),
    };
    this.clients.set(id, updated);
    return updated;
  }

  async delete(_organizationId: string, id: string): Promise<void> {
    const client = this.clients.get(id);
    if (!client) throw new NotFoundError('Client');
    if (client.workOrderCount > 0) {
      throw new ConflictError('Cannot delete a client linked to work orders');
    }
    this.clients.delete(id);
  }

  async findById(
    _organizationId: string,
    id: string,
  ): Promise<Client | null> {
    return this.clients.get(id) ?? null;
  }

  async findMany(
    _organizationId: string,
    filter: ClientFilter,
  ): Promise<{ items: Client[]; nextCursor?: string }> {
    let items = Array.from(this.clients.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (filter.organization) {
      items = items.filter((c) => c.organization === filter.organization);
    }
    if (filter.search) {
      items = items.filter((c) =>
        c.name.toLowerCase().includes(filter.search!.toLowerCase()),
      );
    }
    const limit = filter.limit ?? 20;
    return { items: items.slice(0, limit) };
  }

  async exists(_organizationId: string, id: string): Promise<boolean> {
    return this.clients.has(id);
  }

  setWorkOrderCount(id: string, count: number) {
    const client = this.clients.get(id);
    if (client) {
      client.workOrderCount = count;
    }
  }
}

describe('ClientService', () => {
  let service: ClientService;
  let repository: InMemoryClientRepository;

  beforeEach(async () => {
    repository = new InMemoryClientRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        {
          provide: CLIENT_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();
    service = module.get(ClientService);
  });

  it('creates a client with required fields', async () => {
    const client = await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '+54 9 11 1234 5678',
    });
    expect(client.name).toBe('Acme');
    expect(client.email).toBe('acme@example.com');
    expect(client.workOrderCount).toBe(0);
  });

  it('updates a client and preserves createdAt', async () => {
    const created = await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '123',
    });
    const updated = await service.update('org-1', created.id, {
      name: 'Acme Inc',
    });
    expect(updated.name).toBe('Acme Inc');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it('throws not found when updating unknown client', async () => {
    await expect(
      service.update('org-1', 'missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes an unreferenced client', async () => {
    const created = await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '123',
    });
    await service.delete('org-1', created.id);
    const found = await service.findById('org-1', created.id);
    expect(found).toBeNull();
  });

  it('rejects deleting a referenced client', async () => {
    const created = await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '123',
    });
    repository.setWorkOrderCount(created.id, 1);
    await expect(
      service.delete('org-1', created.id),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('filters clients by organization', async () => {
    await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '123',
      organization: 'Acme Org',
    });
    await service.create('org-1', {
      name: 'Other',
      email: 'other@example.com',
      phone: '456',
      organization: 'Other Org',
    });
    const result = await service.findMany('org-1', {
      organization: 'Acme Org',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Acme');
  });

  it('returns empty list when search matches nothing', async () => {
    await service.create('org-1', {
      name: 'Acme',
      email: 'acme@example.com',
      phone: '123',
    });
    const result = await service.findMany('org-1', { search: 'xyz' });
    expect(result.items).toHaveLength(0);
  });
});
