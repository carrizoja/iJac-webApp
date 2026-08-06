import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '../firebase/firebase.module';
import { CalendarEventMappingRepository, CalendarEventMapping } from './event-mapping.repository';

@Injectable()
export class FirestoreCalendarEventMappingRepository implements CalendarEventMappingRepository {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  private collection() {
    return this.firestore.collection('calendarEventMappings');
  }

  private docId(uid: string, workOrderId: string): string {
    return `${uid}_${workOrderId}`;
  }

  async upsert(mapping: CalendarEventMapping): Promise<void> {
    await this.collection().doc(this.docId(mapping.uid, mapping.workOrderId)).set(mapping);
  }

  async findByWorkOrderId(uid: string, workOrderId: string): Promise<CalendarEventMapping | null> {
    const doc = await this.collection().doc(this.docId(uid, workOrderId)).get();
    if (!doc.exists) return null;
    return doc.data() as CalendarEventMapping;
  }

  async deleteByWorkOrderId(uid: string, workOrderId: string): Promise<void> {
    await this.collection().doc(this.docId(uid, workOrderId)).delete();
  }
}
