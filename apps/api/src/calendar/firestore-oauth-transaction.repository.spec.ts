import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FirestoreOAuthTransactionRepository } from './firestore-oauth-transaction.repository';

describe('FirestoreOAuthTransactionRepository', () => {
  it('returns a future Firestore Timestamp as a non-expired Date', async () => {
    const now = new Date('2026-08-10T12:00:00.000Z');
    const expiresAt = new Date('2026-08-10T12:10:00.000Z');
    const deleteDocument = jest.fn().mockResolvedValue(undefined);
    const getDocument = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'uid-1',
        codeChallenge: 'challenge',
        redirectUri: 'http://localhost:3001/api/calendar/connection/oauth/callback',
        expiresAt: Timestamp.fromDate(expiresAt),
      }),
    });
    const document = {
      get: getDocument,
      delete: deleteDocument,
    };
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(document),
      }),
    } as unknown as Firestore;
    const repository = new FirestoreOAuthTransactionRepository(firestore);

    const transaction = await repository.findAndDelete('nonce-1');

    expect(transaction?.expiresAt).toBeInstanceOf(Date);
    expect(transaction?.expiresAt).toEqual(expiresAt);
    expect(transaction!.expiresAt < now).toBe(false);
    expect(deleteDocument).toHaveBeenCalledTimes(1);
  });

  it('preserves Date values used by in-memory tests', async () => {
    const expiresAt = new Date('2026-08-10T12:10:00.000Z');
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              uid: 'uid-1',
              codeChallenge: 'challenge',
              redirectUri: 'http://localhost/callback',
              expiresAt,
            }),
          }),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as Firestore;
    const repository = new FirestoreOAuthTransactionRepository(firestore);

    const transaction = await repository.findAndDelete('nonce-1');

    expect(transaction?.expiresAt).toBe(expiresAt);
  });
});
