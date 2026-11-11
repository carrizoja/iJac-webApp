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

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank-transfer',
  MERCADO_PAGO = 'mercado-pago',
  CHECK = 'check',
  OTHER = 'other',
}

export enum PaymentStatus {
  ACTIVE = 'active',
  VOIDED = 'voided',
}

export enum PaymentConcept {
  ADVANCE = 'advance',
  BALANCE_SETTLEMENT = 'balance-settlement',
}

export const WORK_ORDER_STATUSES = Object.values(WorkOrderStatus);
export const WORK_ORDER_PRIORITIES = Object.values(WorkOrderPriority);
export const CURRENCIES = Object.values(Currency);
export const PAYMENT_METHODS = Object.values(PaymentMethod);
export const PAYMENT_STATUSES = Object.values(PaymentStatus);
export const PAYMENT_CONCEPTS = Object.values(PaymentConcept);

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  notes?: string;
  /** Normalized digits only (DNI or CUIT). */
  taxId?: string;
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
  /** Total price in minor currency units (cents); present together with `currency`. */
  totalPriceMinor?: number;
  currency?: Currency;
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
  totalPriceMinor?: number;
  currency?: Currency;
  /** Sum of active payments, in minor units; present only on priced work orders. */
  paidMinor?: number;
  /** `totalPriceMinor - paidMinor`; present only on priced work orders. */
  remainingMinor?: number;
  /** Whether the order has any payment, voided ones included; such orders cannot be deleted. */
  hasPayments?: boolean;
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
  /** Printed under the receipt signature line; omitted when not set. */
  signatoryName?: string;
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

export interface PaymentActor {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface PaymentIssuerSnapshot {
  businessName: string;
  cuit: string;
  address: string;
  phone: string;
}

export interface PaymentClientSnapshot {
  name: string;
  taxId?: string;
}

export interface PaymentVoidData {
  reason: string;
  voidedBy: PaymentActor;
  voidedAt: string;
}

/**
 * A payment received against a work order. Immutable once recorded: only
 * `status` and `void` change, when the payment is voided. The issuer, client,
 * work-order title and concept are snapshots taken at issuance so a reprinted
 * receipt never changes.
 */
export interface Payment {
  id: string;
  workOrderId: string;
  /** Sequential per organization; display with `formatReceiptNumber`. */
  receiptNumber: number;
  /** Positive integer in minor currency units (cents). */
  amountMinor: number;
  currency: Currency;
  /** ISO calendar date, `YYYY-MM-DD`. */
  paymentDate: string;
  method: PaymentMethod;
  notes?: string;
  status: PaymentStatus;
  concept: PaymentConcept;
  issuer: PaymentIssuerSnapshot;
  client: PaymentClientSnapshot;
  workOrderTitle: string;
  recordedBy: PaymentActor;
  createdAt: string;
  void?: PaymentVoidData;
}

export interface WorkOrderBalance {
  currency: Currency;
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
}

/**
 * `GET /work-orders/:id/payments` response. `balance` is null for an unpriced
 * work order; `canManage` reflects whether the caller may record or void.
 */
export interface WorkOrderPaymentsResponse {
  items: Payment[];
  balance: WorkOrderBalance | null;
  canManage: boolean;
}

/**
 * Body of `GET /payments?date=YYYY-MM-DD`: the organization's active payments with that payment
 * date (the date on the receipt), and what they add up to per currency, never mixed.
 */
export interface DailyPaymentsResponse {
  date: string;
  items: Payment[];
  totals: { currency: Currency; amountMinor: number }[];
}

/** Body of `GET /me`: what the signed-in member may do in their organization. */
export interface CurrentMemberResponse {
  role: OrganizationMemberRole;
}

/** Body of `POST /work-orders/:id/payments`. */
export interface RecordPaymentInput {
  amountMinor: number;
  paymentDate: string;
  method: PaymentMethod;
  notes?: string;
  /** Client-generated UUID v4; a retry with the same key returns the original payment. */
  idempotencyKey?: string;
}

/** Body of `POST /work-orders/:id/payments/:paymentId/void`. */
export interface VoidPaymentInput {
  reason: string;
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
