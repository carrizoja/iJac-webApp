import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '../firebase/firebase.module';
import { CalendarConnectionRepository, CalendarConnection } from './connection.repository';

@Injectable()
export class FirestoreCalendarConnectionRepository implements CalendarConnectionRepository {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  private collection() {
    return this.firestore.collection('calendarConnections');
  }

  async save(connection: CalendarConnection): Promise<void> {
    const { credential, ...safe } = connection;
    await this.collection().doc(connection.uid).set({
      ...safe,
      credential,
      updatedAt: new Date().toISOString(),
    });
  }

  async findByUid(uid: string): Promise<CalendarConnection | null> {
    const doc = await this.collection().doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as CalendarConnection;
  }

  async updateStatus(uid: string, status: CalendarConnection['status']): Promise<void> {
    await this.collection().doc(uid).update({
      status,
      connected: status === 'active',
      updatedAt: new Date().toISOString(),
    });
  }
}
