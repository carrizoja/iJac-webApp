import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google, calendar_v3 } from 'googleapis';
import { CalendarConnectionRepository } from './connection.repository';
import { CalendarEventMappingRepository, CalendarEventMapping } from './event-mapping.repository';
import { CredentialEncryption } from './credential-encryption';
import { CALENDAR_CONNECTION_REPOSITORY, CALENDAR_EVENT_MAPPING_REPOSITORY } from './calendar-connection.constants';
import { ApiEnvironment } from '../config/env';

export interface GoogleCalendarClient {
  client: calendar_v3.Calendar;
  accountEmail?: string;
}

export interface SyncResult {
  success: boolean;
  mapping: CalendarEventMapping;
}

@Injectable()
export class CalendarSyncService {
  private readonly encryption: CredentialEncryption;

  constructor(
    private readonly config: ConfigService<ApiEnvironment>,
    @Inject(CALENDAR_CONNECTION_REPOSITORY) private readonly connectionRepository: CalendarConnectionRepository,
    @Inject(CALENDAR_EVENT_MAPPING_REPOSITORY) private readonly mappingRepository: CalendarEventMappingRepository,
  ) {
    this.encryption = new CredentialEncryption(config.getOrThrow('CREDENTIAL_ENCRYPTION_KEY'));
  }

  async getClient(uid: string): Promise<GoogleCalendarClient | null> {
    const connection = await this.connectionRepository.findByUid(uid);
    if (!connection || connection.status !== 'active') {
      return null;
    }

    const refreshToken = this.encryption.decrypt(connection.credential);
    const oauthClient = new OAuth2Client(
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
    );
    oauthClient.setCredentials({ refresh_token: refreshToken });

    const client = google.calendar({ version: 'v3', auth: oauthClient });
    return { client, accountEmail: connection.accountEmail };
  }

  async syncWorkOrder(
    uid: string,
    workOrder: { id: string; title: string; description?: string; dueDate?: string; status: string; clientName?: string },
  ): Promise<SyncResult> {
    const google = await this.getClient(uid);
    if (!google) {
      return this.failMapping(uid, workOrder.id, 'reconnect_required', 'No active Google Calendar connection');
    }

    const existing = await this.mappingRepository.findByWorkOrderId(uid, workOrder.id);
    const event = this.buildEvent(workOrder);

    try {
      if (existing?.googleEventId && existing.googleCalendarId) {
        const updated = await google.client.events.update({
          calendarId: existing.googleCalendarId,
          eventId: existing.googleEventId,
          requestBody: event,
        });
        return this.saveMapping(uid, workOrder.id, existing.googleCalendarId, updated.data.id ?? existing.googleEventId, 'synced');
      }

      const calendarId = 'primary';
      const created = await google.client.events.insert({
        calendarId,
        requestBody: event,
      });
      return this.saveMapping(uid, workOrder.id, calendarId, created.data.id ?? undefined, 'synced');
    } catch (err) {
      const code = this.classifyError(err);
      if (code === 'reconnect_required') {
        await this.connectionRepository.updateStatus(uid, 'reconnect_required');
      }
      return this.failMapping(uid, workOrder.id, code, this.errorMessage(err));
    }
  }

  async deleteWorkOrder(uid: string, workOrderId: string): Promise<SyncResult> {
    const google = await this.getClient(uid);
    const existing = await this.mappingRepository.findByWorkOrderId(uid, workOrderId);
    if (!existing) {
      return this.saveMapping(uid, workOrderId, undefined, undefined, 'synced');
    }

    if (google && existing.googleEventId && existing.googleCalendarId) {
      try {
        await google.client.events.delete({
          calendarId: existing.googleCalendarId,
          eventId: existing.googleEventId,
        });
      } catch (err) {
        const code = this.classifyError(err);
        if (code === 'reconnect_required') {
          await this.connectionRepository.updateStatus(uid, 'reconnect_required');
        }
        return this.failMapping(uid, workOrderId, code, this.errorMessage(err));
      }
    }

    await this.mappingRepository.deleteByWorkOrderId(uid, workOrderId);
    return { success: true, mapping: { id: `${uid}_${workOrderId}`, uid, workOrderId, status: 'synced' } };
  }

  async getSyncStatus(uid: string): Promise<{ connected: boolean; status: string }> {
    const connection = await this.connectionRepository.findByUid(uid);
    if (!connection) {
      return { connected: false, status: 'disconnected' };
    }
    return { connected: connection.status === 'active', status: connection.status };
  }

  private buildEvent(workOrder: { title: string; description?: string; dueDate?: string; status: string; clientName?: string }): calendar_v3.Schema$Event {
    const description = [workOrder.description, workOrder.status, workOrder.clientName ? `Cliente: ${workOrder.clientName}` : undefined]
      .filter(Boolean)
      .join(' | ');
    return {
      summary: workOrder.title,
      description,
      start: workOrder.dueDate ? { dateTime: workOrder.dueDate } : undefined,
      end: workOrder.dueDate ? { dateTime: workOrder.dueDate } : undefined,
    };
  }

  private classifyError(err: unknown): CalendarEventMapping['status'] {
    const message = this.errorMessage(err).toLowerCase();
    if (message.includes('invalid_grant') || message.includes('token') || message.includes('unauthorized')) {
      return 'reconnect_required';
    }
    return 'failed';
  }

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }

  private async saveMapping(
    uid: string,
    workOrderId: string,
    googleCalendarId: string | undefined,
    googleEventId: string | undefined,
    status: CalendarEventMapping['status'],
  ): Promise<SyncResult> {
    const mapping: CalendarEventMapping = {
      id: `${uid}_${workOrderId}`,
      uid,
      workOrderId,
      googleCalendarId,
      googleEventId,
      status,
      lastSyncedAt: new Date().toISOString(),
    };
    await this.mappingRepository.upsert(mapping);
    return { success: status === 'synced', mapping };
  }

  private async failMapping(
    uid: string,
    workOrderId: string,
    status: CalendarEventMapping['status'],
    message: string,
  ): Promise<SyncResult> {
    const mapping: CalendarEventMapping = {
      id: `${uid}_${workOrderId}`,
      uid,
      workOrderId,
      status,
      errorMessage: message,
      lastSyncedAt: new Date().toISOString(),
    };
    await this.mappingRepository.upsert(mapping);
    return { success: false, mapping };
  }
}
