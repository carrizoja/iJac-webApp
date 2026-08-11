import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google, calendar_v3 } from 'googleapis';
import { CalendarConnectionRepository } from './connection.repository';
import { CalendarEventMappingRepository, CalendarEventMapping } from './event-mapping.repository';
import { CredentialEncryption } from './credential-encryption';
import {
  CALENDAR_CONNECTION_REPOSITORY,
  CALENDAR_EVENT_MAPPING_REPOSITORY,
} from './calendar-connection.constants';
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
    @Inject(CALENDAR_CONNECTION_REPOSITORY)
    private readonly connectionRepository: CalendarConnectionRepository,
    @Inject(CALENDAR_EVENT_MAPPING_REPOSITORY)
    private readonly mappingRepository: CalendarEventMappingRepository,
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
    organizationId: string,
    workOrder: {
      id: string;
      title: string;
      description?: string;
      dueDate?: string;
      status: string;
      clientName?: string;
    },
  ): Promise<SyncResult> {
    const google = await this.getClient(uid);
    if (!google) {
      return this.failMapping(
        organizationId,
        workOrder.id,
        'reconnect_required',
        'No active Google Calendar connection',
      );
    }

    const existing = await this.mappingRepository.findByWorkOrderId(organizationId, workOrder.id);
    const event = this.buildEvent(workOrder);

    try {
      if (existing?.googleEventId && existing.googleCalendarId) {
        const updated = await google.client.events.update({
          calendarId: existing.googleCalendarId,
          eventId: existing.googleEventId,
          requestBody: event,
        });
        return this.saveMapping(
          organizationId,
          workOrder.id,
          existing.googleCalendarId,
          updated.data.id ?? existing.googleEventId,
          'synced',
        );
      }

      const calendarId = 'primary';
      const created = await google.client.events.insert({
        calendarId,
        requestBody: event,
      });
      return this.saveMapping(
        organizationId,
        workOrder.id,
        calendarId,
        created.data.id ?? undefined,
        'synced',
      );
    } catch (err) {
      const code = this.classifyError(err);
      if (code === 'reconnect_required') {
        await this.connectionRepository.updateStatus(uid, 'reconnect_required');
      }
      return this.failMapping(organizationId, workOrder.id, code, this.errorMessage(err));
    }
  }

  async deleteWorkOrder(
    uid: string,
    organizationId: string,
    workOrderId: string,
  ): Promise<SyncResult> {
    const google = await this.getClient(uid);
    const existing = await this.mappingRepository.findByWorkOrderId(organizationId, workOrderId);
    if (!existing) {
      return this.saveMapping(organizationId, workOrderId, undefined, undefined, 'synced');
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
        return this.failMapping(organizationId, workOrderId, code, this.errorMessage(err));
      }
    }

    await this.mappingRepository.deleteByWorkOrderId(organizationId, workOrderId);
    return {
      success: true,
      mapping: {
        id: workOrderId,
        uid,
        workOrderId,
        status: 'synced',
      },
    };
  }

  async getSyncStatus(uid: string): Promise<{ connected: boolean; status: string }> {
    const connection = await this.connectionRepository.findByUid(uid);
    if (!connection) {
      return { connected: false, status: 'disconnected' };
    }
    return { connected: connection.status === 'active', status: connection.status };
  }

  private buildEvent(workOrder: {
    title: string;
    description?: string;
    dueDate?: string;
    status: string;
    clientName?: string;
  }): calendar_v3.Schema$Event {
    const description = [
      workOrder.description,
      workOrder.status,
      workOrder.clientName ? `Cliente: ${workOrder.clientName}` : undefined,
    ]
      .filter(Boolean)
      .join(' | ');
    const startDate = workOrder.dueDate?.slice(0, 10);
    let endDate: string | undefined;
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      endDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    }
    return {
      summary: workOrder.title,
      description,
      start: startDate ? { date: startDate } : undefined,
      end: endDate ? { date: endDate } : undefined,
    };
  }

  private classifyError(err: unknown): CalendarEventMapping['status'] {
    const message = this.errorMessage(err).toLowerCase();
    if (
      message.includes('invalid_grant') ||
      message.includes('token') ||
      message.includes('unauthorized')
    ) {
      return 'reconnect_required';
    }
    return 'failed';
  }

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }

  private async saveMapping(
    organizationId: string,
    workOrderId: string,
    googleCalendarId: string | undefined,
    googleEventId: string | undefined,
    status: CalendarEventMapping['status'],
  ): Promise<SyncResult> {
    const mapping: CalendarEventMapping = {
      id: workOrderId,
      uid: '',
      workOrderId,
      googleCalendarId,
      googleEventId,
      status,
      lastSyncedAt: new Date().toISOString(),
    };
    await this.mappingRepository.upsert(organizationId, mapping);
    return { success: status === 'synced', mapping };
  }

  private async failMapping(
    organizationId: string,
    workOrderId: string,
    status: CalendarEventMapping['status'],
    message: string,
  ): Promise<SyncResult> {
    const mapping: CalendarEventMapping = {
      id: workOrderId,
      uid: '',
      workOrderId,
      status,
      errorMessage: message,
      lastSyncedAt: new Date().toISOString(),
    };
    await this.mappingRepository.upsert(organizationId, mapping);
    return { success: false, mapping };
  }
}
