import { Injectable, Inject } from '@nestjs/common';
import { ClientRepository, CreateClientInput, UpdateClientInput, ClientFilter } from './client.repository';
import { Client } from '@ijac/shared';
import { CLIENT_REPOSITORY } from './client.constants';

@Injectable()
export class ClientService {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repository: ClientRepository) {}

  async create(uid: string, input: CreateClientInput): Promise<Client> {
    return this.repository.create(uid, input);
  }

  async update(uid: string, id: string, input: UpdateClientInput): Promise<Client> {
    return this.repository.update(uid, id, input);
  }

  async delete(uid: string, id: string): Promise<void> {
    await this.repository.delete(uid, id);
  }

  async findById(uid: string, id: string): Promise<Client | null> {
    return this.repository.findById(uid, id);
  }

  async findMany(uid: string, filter: ClientFilter): Promise<{ items: Client[]; nextCursor?: string }> {
    return this.repository.findMany(uid, filter);
  }
}
