import { Firestore } from 'firebase-admin/firestore';
import { CalendarConnection } from './connection.repository';
import { FirestoreCalendarConnectionRepository } from './firestore-connection.repository';

function containsUndefined(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUndefined);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((field) => field === undefined || containsUndefined(field));
  }
  return false;
}

describe('FirestoreCalendarConnectionRepository', () => {
  it('persists a connection without accountEmail or undefined fields', async () => {
    let persisted: Record<string, unknown> | undefined;
    const setDocument = jest.fn(async (document: Record<string, unknown>) => {
      if (containsUndefined(document)) {
        throw new Error('Firestore document contains undefined');
      }
      persisted = document;
    });
    const document = { set: setDocument };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(document),
      }),
    } as unknown as Firestore;
    const repository = new FirestoreCalendarConnectionRepository(firestore);
    const connection: CalendarConnection = {
      uid: 'uid-1',
      connected: true,
      grantedScopes: ['https://www.googleapis.com/auth/calendar'],
      credential: {
        encrypted: 'encrypted-refresh-token',
        version: 1,
        iv: 'initialization-vector',
        tag: 'authentication-tag',
      },
      status: 'active',
      updatedAt: '2026-08-10T12:00:00.000Z',
    };

    await expect(repository.save(connection)).resolves.toBeUndefined();

    expect(setDocument).toHaveBeenCalledTimes(1);
    expect(persisted).not.toHaveProperty('accountEmail');
    expect(containsUndefined(persisted)).toBe(false);
    expect(persisted).toMatchObject({
      uid: connection.uid,
      connected: true,
      grantedScopes: connection.grantedScopes,
      credential: connection.credential,
      status: 'active',
    });
  });
});
