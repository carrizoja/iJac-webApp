import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiDownload } from './api';
import type { DownloadedFile } from './api';
import { getCurrentToken } from './auth';
import type {
  Client,
  WorkOrder,
  WorkOrderClientSummary,
  PaginatedResponse,
  OrganizationProfile,
  OrganizationProfileInput,
  CurrentMemberResponse,
  OrganizationProfileResponse,
  Payment,
  RecordPaymentInput,
  VoidPaymentInput,
  WorkOrderPaymentsResponse,
  DailyPaymentsResponse,
  BrandingImage,
  BrandingImageInput,
  BrandingImageResponse,
  BrandingKind,
} from '@ijac/shared';

/** API failure that keeps the error code as its message plus any field-level details. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(code);
    this.name = 'ApiRequestError';
  }
}

async function withToken<T>(
  fn: (token: string) => Promise<{
    data?: T;
    error?: { code: string; message: string; fieldErrors?: Record<string, string> };
  }>,
): Promise<T> {
  const token = await getCurrentToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  const result = await fn(token);
  if (result.error) {
    throw new ApiRequestError(result.error.code, result.error.fieldErrors);
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
  input: Partial<Omit<WorkOrder, 'dueDate' | 'totalPriceMinor'>> & {
    dueDate?: string | null;
    /** `null` clears the price and its currency. */
    totalPriceMinor?: number | null;
  },
): Promise<WorkOrder> {
  return withToken((token) => apiPatch(`/work-orders/${id}`, input, token));
}

export async function deleteWorkOrder(id: string): Promise<void> {
  return withToken((token) => apiDelete(`/work-orders/${id}`, token));
}

/** The signed-in member's role, used to show only the actions they may take. */
export async function getCurrentMember(): Promise<CurrentMemberResponse> {
  return withToken((token) => apiGet('/me', token));
}

export async function getOrganizationProfile(): Promise<OrganizationProfileResponse> {
  return withToken((token) => apiGet('/organization/profile', token));
}

export async function saveOrganizationProfile(
  input: OrganizationProfileInput,
): Promise<OrganizationProfile> {
  return withToken((token) => apiPut('/organization/profile', input, token));
}

export async function listPayments(workOrderId: string): Promise<WorkOrderPaymentsResponse> {
  return withToken((token) =>
    apiGet(`/work-orders/${encodeURIComponent(workOrderId)}/payments`, token),
  );
}

/** The organization's active payments dated `date` (YYYY-MM-DD), with a total per currency. */
export async function listPaymentsByDate(date: string): Promise<DailyPaymentsResponse> {
  return withToken((token) => apiGet(`/payments?date=${encodeURIComponent(date)}`, token));
}

export async function recordPayment(
  workOrderId: string,
  input: RecordPaymentInput,
): Promise<Payment> {
  return withToken((token) =>
    apiPost(`/work-orders/${encodeURIComponent(workOrderId)}/payments`, input, token),
  );
}

export async function voidPayment(
  workOrderId: string,
  paymentId: string,
  input: VoidPaymentInput,
): Promise<Payment> {
  return withToken((token) =>
    apiPost(
      `/work-orders/${encodeURIComponent(workOrderId)}/payments/${encodeURIComponent(paymentId)}/void`,
      input,
      token,
    ),
  );
}

export async function getBrandingImage(kind: BrandingKind): Promise<BrandingImageResponse> {
  return withToken((token) => apiGet(`/organization/branding/${kind}`, token));
}

export async function saveBrandingImage(
  kind: BrandingKind,
  input: BrandingImageInput,
): Promise<BrandingImage> {
  return withToken((token) => apiPut(`/organization/branding/${kind}`, input, token));
}

export async function deleteBrandingImage(kind: BrandingKind): Promise<void> {
  return withToken((token) => apiDelete(`/organization/branding/${kind}`, token));
}

/** A full copy of the organization's records, for admins: Excel to read, JSON for machines. */
export async function downloadDataExport(format: 'xlsx' | 'json'): Promise<DownloadedFile> {
  return withToken((token) => apiDownload(`/export.${format}`, token, `ijac-export.${format}`));
}
