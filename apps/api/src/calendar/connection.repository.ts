export interface StoredRefreshCredential {
  encrypted: string;
  version: number;
  iv: string;
  tag: string;
}

export interface CalendarConnection {
  uid: string;
  connected: boolean;
  accountEmail?: string;
  grantedScopes: string[];
  credential: StoredRefreshCredential;
  status: 'active' | 'expired' | 'reconnect_required';
  updatedAt: string;
}

export interface CalendarConnectionRepository {
  save(connection: CalendarConnection): Promise<void>;
  findByUid(uid: string): Promise<CalendarConnection | null>;
  updateStatus(uid: string, status: CalendarConnection['status']): Promise<void>;
}
