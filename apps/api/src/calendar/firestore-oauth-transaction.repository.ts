import { Injectable, Inject } from '@nestjs/common';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FIRESTORE } from '../firebase/firebase.module';
import { OAuthTransactionRepository, OAuthTransaction } from './oauth-transaction.repository';

@Injectable()
export class FirestoreOAuthTransactionRepository implements OAuthTransactionRepository {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  private collection() {
    return this.firestore.collection('oauthTransactions');
  }

  async create(transaction: OAuthTransaction): Promise<void> {
    await this.collection().doc(transaction.nonce).set({
      uid: transaction.uid,
      codeChallenge: transaction.codeChallenge,
      redirectUri: transaction.redirectUri,
      expiresAt: transaction.expiresAt,
    });
  }

  async findAndDelete(nonce: string): Promise<OAuthTransaction | null> {
    const ref = this.collection().doc(nonce);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data() as Omit<OAuthTransaction, 'nonce' | 'expiresAt'> & {
      expiresAt: Date | Timestamp;
    };
    await ref.delete();
    return {
      nonce,
      ...data,
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : data.expiresAt.toDate(),
    };
  }
}
