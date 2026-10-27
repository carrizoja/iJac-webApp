export enum WorkOrderStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkOrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum Currency {
  ARS = 'ARS',
  USD = 'USD',
}

export const WORK_ORDER_STATUSES = Object.values(WorkOrderStatus);
export const WORK_ORDER_PRIORITIES = Object.values(WorkOrderPriority);
export const CURRENCIES = Object.values(Currency);

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  notes?: string;
  searchPrefixes?: string[];
  workOrderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  clientId: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderClientSummary {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export enum OrganizationMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface OrganizationMembership {
  uid: string;
  organizationId: string;
  role: OrganizationMemberRole;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface ActiveMembershipLocator {
  uid: string;
  organizationId: string;
  status: 'active' | 'inactive';
  updatedAt: string;
}

export interface ActorContext {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  organizationId: string;
  role: OrganizationMemberRole;
}

export interface OrganizationProfile {
  businessName: string;
  /** CUIT stored as 11 digits, without separators. */
  cuit: string;
  address: string;
  phone: string;
  updatedAt: string;
}

/** Profile lookup result; `configured: false` means it has never been saved. */
export type OrganizationProfileStatus =
  { configured: true; profile: OrganizationProfile } | { configured: false };

/** Body of `PUT /organization/profile`; `updatedAt` is server-managed. */
export type OrganizationProfileInput = Omit<OrganizationProfile, 'updatedAt'>;

/** `GET /organization/profile` response; `canEdit` reflects the caller's role. */
export type OrganizationProfileResponse = OrganizationProfileStatus & {
  canEdit: boolean;
};

export interface CalendarEvent {
  id: string;
  workOrderId: string;
  title: string;
  dueDate: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}
