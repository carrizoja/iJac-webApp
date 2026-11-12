import { Client } from '@ijac/shared';

export interface CreateClientInput {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  notes?: string;
  /** Normalized digits only. On update, an empty string clears the stored value. */
  taxId?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  notes?: string;
  /** Normalized digits only. On update, an empty string clears the stored value. */
  taxId?: string;
}

export interface ClientFilter {
  search?: string;
  organization?: string;
  cursor?: string;
  limit?: number;
}

export interface ClientRepository {
  create(organizationId: string, input: CreateClientInput): Promise<Client>;
  update(organizationId: string, id: string, input: UpdateClientInput): Promise<Client>;
  delete(organizationId: string, id: string): Promise<void>;
  findById(organizationId: string, id: string): Promise<Client | null>;
  findMany(
    organizationId: string,
    filter: ClientFilter,
  ): Promise<{ items: Client[]; nextCursor?: string }>;
  exists(organizationId: string, id: string): Promise<boolean>;
  /** Every client of the organization, oldest first. Used by the data export. */
  listAll(organizationId: string): Promise<Client[]>;
}
