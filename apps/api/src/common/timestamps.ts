import { Timestamp } from 'firebase-admin/firestore';

export function toTimestamp(date: string | Date | undefined): Timestamp | undefined {
  if (!date) return undefined;
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
}

export function toIsoString(timestamp: Timestamp | Date | undefined): string | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp.toISOString();
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}
