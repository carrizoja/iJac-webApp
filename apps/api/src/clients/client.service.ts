import { Injectable, Inject } from '@nestjs/common';
import { ClientRepository, CreateClientInput, UpdateClientInput, ClientFilter } from './client.repository';
import { Client } from '@ijac/shared';
import { CLIENT_REPOSITORY } from './client.constants';

@Injectable()
export class ClientService {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repository: ClientRepository) {}

  async create(
    organizationId: string,
    input: CreateClientInput,
  ): Promise<Client> {
    return this.repository.create(organizationId, input);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateClientInput,
  ): Promise<Client> {
    return this.repository.update(organizationId, id, input);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.repository.delete(organizationId, id);
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<Client | null> {
    return this.repository.findById(organizationId, id);
  }

  async findMany(
    organizationId: string,
    filter: ClientFilter,
  ): Promise<{ items: Client[]; nextCursor?: string }> {
    return this.repository.findMany(organizationId, filter);
  }
}
