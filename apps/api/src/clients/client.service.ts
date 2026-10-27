import { Injectable, Inject } from '@nestjs/common';
import {
  ClientRepository,
  CreateClientInput,
  UpdateClientInput,
  ClientFilter,
} from './client.repository';
import { Client, isValidCuit, normalizeTaxId } from '@ijac/shared';
import { ValidationError } from '../common/errors';
import { CLIENT_REPOSITORY } from './client.constants';

@Injectable()
export class ClientService {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repository: ClientRepository) {}

  async create(organizationId: string, input: CreateClientInput): Promise<Client> {
    const taxId = this.normalizeAndValidateTaxId(input.taxId);
    const { taxId: _raw, ...rest } = input;
    return this.repository.create(organizationId, {
      ...rest,
      ...(taxId && { taxId }),
    });
  }

  async update(organizationId: string, id: string, input: UpdateClientInput): Promise<Client> {
    if (input.taxId === undefined) {
      return this.repository.update(organizationId, id, input);
    }
    const taxId = this.normalizeAndValidateTaxId(input.taxId) ?? '';
    return this.repository.update(organizationId, id, { ...input, taxId });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.repository.delete(organizationId, id);
  }

  async findById(organizationId: string, id: string): Promise<Client | null> {
    return this.repository.findById(organizationId, id);
  }

  async findMany(
    organizationId: string,
    filter: ClientFilter,
  ): Promise<{ items: Client[]; nextCursor?: string }> {
    return this.repository.findMany(organizationId, filter);
  }

  /** Returns digits only, or undefined when blank. Throws a field-level error when invalid. */
  private normalizeAndValidateTaxId(value: string | undefined): string | undefined {
    const normalized = normalizeTaxId(value ?? '');
    if (!normalized) return undefined;
    const validLength = /^\d{7,11}$/.test(normalized);
    if (!validLength || (normalized.length === 11 && !isValidCuit(normalized))) {
      throw new ValidationError('Invalid client', {
        taxId: 'taxId must be a valid DNI (7-10 digits) or CUIT (11 digits)',
      });
    }
    return normalized;
  }
}
