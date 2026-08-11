import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { getCurrentToken } from './auth';
import type { Client, WorkOrder, WorkOrderClientSummary, PaginatedResponse } from '@ijac/shared';

async function withToken<T>(
  fn: (token: string) => Promise<{ data?: T; error?: { code: string; message: string } }>,
): Promise<T> {
  const token = await getCurrentToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  const result = await fn(token);
  if (result.error) {
    throw new Error(result.error.code);
  }
  return result.data as T;
}

export async function listClients(filter?: {
  search?: string;
  organization?: string;
  cursor?: string;
}): Promise<PaginatedResponse<Client>> {
  const params = new URLSearchParams();
  if (filter?.search) params.set('search', filter.search);
  if (filter?.organization) params.set('organization', filter.organization);
  if (filter?.cursor) params.set('cursor', filter.cursor);
  const query = params.toString();
  return withToken((token) => apiGet(`/clients${query ? `?${query}` : ''}`, token));
}

export async function getClient(id: string): Promise<Client> {
  return withToken((token) => apiGet(`/clients/${encodeURIComponent(id)}`, token));
}

export async function createClient(
  input: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'workOrderCount'>,
): Promise<Client> {
  return withToken((token) => apiPost('/clients', input, token));
}

export async function updateClient(id: string, input: Partial<Client>): Promise<Client> {
  return withToken((token) => apiPatch(`/clients/${id}`, input, token));
}

export async function deleteClient(id: string): Promise<void> {
  return withToken((token) => apiDelete(`/clients/${id}`, token));
}

export async function listWorkOrders(filter?: {
  status?: string;
  priority?: string;
  clientId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  cursor?: string;
}): Promise<PaginatedResponse<WorkOrderClientSummary>> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.priority) params.set('priority', filter.priority);
  if (filter?.clientId) params.set('clientId', filter.clientId);
  if (filter?.dueDateFrom) params.set('dueDateFrom', filter.dueDateFrom);
  if (filter?.dueDateTo) params.set('dueDateTo', filter.dueDateTo);
  if (filter?.cursor) params.set('cursor', filter.cursor);
  const query = params.toString();
  return withToken((token) => apiGet(`/work-orders${query ? `?${query}` : ''}`, token));
}

export async function createWorkOrder(
  input: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<WorkOrder> {
  return withToken((token) => apiPost('/work-orders', input, token));
}

export async function getWorkOrder(id: string): Promise<WorkOrder> {
  return withToken((token) => apiGet(`/work-orders/${encodeURIComponent(id)}`, token));
}

export async function updateWorkOrder(
  id: string,
  input: Partial<Omit<WorkOrder, 'dueDate'>> & { dueDate?: string | null },
): Promise<WorkOrder> {
  return withToken((token) => apiPatch(`/work-orders/${id}`, input, token));
}

export async function deleteWorkOrder(id: string): Promise<void> {
  return withToken((token) => apiDelete(`/work-orders/${id}`, token));
}
