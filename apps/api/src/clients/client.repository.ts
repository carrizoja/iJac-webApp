import { Client } from '@ijac/shared';

export interface CreateClientInput {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  notes?: string;
}

export interface ClientFilter {
  search?: string;
  organization?: string;
  cursor?: string;
  limit?: number;
}

export interface ClientRepository {
  create(uid: string, input: CreateClientInput): Promise<Client>;
  update(uid: string, id: string, input: UpdateClientInput): Promise<Client>;
  delete(uid: string, id: string): Promise<void>;
  findById(uid: string, id: string): Promise<Client | null>;
  findMany(uid: string, filter: ClientFilter): Promise<{ items: Client[]; nextCursor?: string }>;
  exists(uid: string, id: string): Promise<boolean>;
}
