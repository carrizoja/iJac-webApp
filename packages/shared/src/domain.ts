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

export const WORK_ORDER_STATUSES = Object.values(WorkOrderStatus);
export const WORK_ORDER_PRIORITIES = Object.values(WorkOrderPriority);

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
