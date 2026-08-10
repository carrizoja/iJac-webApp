export type SyncStatus = 'pending' | 'synced' | 'failed' | 'reconnect_required';

export interface CalendarEventMapping {
  id: string;
  uid: string;
  workOrderId: string;
  googleCalendarId?: string;
  googleEventId?: string;
  status: SyncStatus;
  errorCode?: string;
  errorMessage?: string;
  lastSyncedAt?: string;
}

export interface CalendarEventMappingRepository {
  upsert(
    organizationId: string,
    mapping: CalendarEventMapping,
  ): Promise<void>;
  findByWorkOrderId(
    organizationId: string,
    workOrderId: string,
  ): Promise<CalendarEventMapping | null>;
  deleteByWorkOrderId(
    organizationId: string,
    workOrderId: string,
  ): Promise<void>;
}
