import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '../firebase/firebase.module';
import { ApiEnvironment } from '../config/env';
import { CalendarEventMappingRepository, CalendarEventMapping } from './event-mapping.repository';

@Injectable()
export class FirestoreCalendarEventMappingRepository implements CalendarEventMappingRepository {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  private collection(organizationId: string) {
    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return this.firestore.collection('calendarEventMappings');
    }

    return this.firestore
      .collection('organizations')
      .doc(organizationId)
      .collection('calendarEventMappings');
  }

  private docId(scopeId: string, workOrderId: string): string {
    return (this.config.get('REPOSITORY_MODE') ?? 'global') === 'global'
      ? `${scopeId}_${workOrderId}`
      : workOrderId;
  }

  async upsert(
    organizationId: string,
    mapping: CalendarEventMapping,
  ): Promise<void> {
    await this.collection(organizationId)
      .doc(this.docId(organizationId, mapping.workOrderId))
      .set(mapping);
  }

  async findByWorkOrderId(
    organizationId: string,
    workOrderId: string,
  ): Promise<CalendarEventMapping | null> {
    const doc = await this.collection(organizationId)
      .doc(this.docId(organizationId, workOrderId))
      .get();
    if (!doc.exists) return null;
    return doc.data() as CalendarEventMapping;
  }

  async deleteByWorkOrderId(
    organizationId: string,
    workOrderId: string,
  ): Promise<void> {
    await this.collection(organizationId)
      .doc(this.docId(organizationId, workOrderId))
      .delete();
  }
}
