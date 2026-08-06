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
  upsert(mapping: CalendarEventMapping): Promise<void>;
  findByWorkOrderId(uid: string, workOrderId: string): Promise<CalendarEventMapping | null>;
  deleteByWorkOrderId(uid: string, workOrderId: string): Promise<void>;
}
