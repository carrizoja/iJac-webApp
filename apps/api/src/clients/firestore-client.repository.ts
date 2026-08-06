import { Client } from '@ijac/shared';
import { ClientRepository, CreateClientInput, UpdateClientInput, ClientFilter } from './client.repository';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { Injectable, Inject } from '@nestjs/common';
import { FIRESTORE } from '../firebase/firebase.module';
import { toIsoString, nowTimestamp } from '../common/timestamps';
import { NotFoundError, ConflictError } from '../common/errors';

@Injectable()
export class FirestoreClientRepository implements ClientRepository {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  private collection() {
    return this.firestore.collection('clients');
  }

  private toClient(doc: FirebaseFirestore.DocumentSnapshot): Client {
    const data = doc.data() as Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
    };
    return {
      ...data,
      id: doc.id,
      createdAt: toIsoString(data.createdAt) ?? '',
      updatedAt: toIsoString(data.updatedAt) ?? '',
    };
  }

  private normalizeSearch(input: CreateClientInput | UpdateClientInput): string[] {
    const terms = new Set<string>();
    const sources = [
      input.name,
      input.email,
      input.phone,
      input.organization,
    ].filter((v): v is string => typeof v === 'string' && v.length > 0);
    for (const source of sources) {
      const normalized = source.toLowerCase().trim();
      for (let i = 1; i <= Math.min(10, normalized.length); i++) {
        terms.add(normalized.slice(0, i));
      }
    }
    return Array.from(terms);
  }

  async create(_uid: string, input: CreateClientInput): Promise<Client> {
    const now = nowTimestamp();
    const ref = this.collection().doc();
    const client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
    } = {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      organization: input.organization?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      searchPrefixes: this.normalizeSearch(input),
      workOrderCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(client);
    return this.toClient(await ref.get());
  }

  async update(_uid: string, id: string, input: UpdateClientInput): Promise<Client> {
    const ref = this.collection().doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new NotFoundError('Client');
    }
    const update: Record<string, unknown> = { updatedAt: nowTimestamp() };
    if (input.name !== undefined) update.name = input.name.trim();
    if (input.email !== undefined) update.email = input.email.trim();
    if (input.phone !== undefined) update.phone = input.phone.trim();
    if (input.organization !== undefined) update.organization = input.organization.trim();
    if (input.notes !== undefined) update.notes = input.notes.trim();
    if (Object.keys(input).length > 0) {
      update.searchPrefixes = this.normalizeSearch({
        name: (update.name as string) ?? (doc.get('name') as string),
        email: (update.email as string) ?? (doc.get('email') as string),
        phone: (update.phone as string) ?? (doc.get('phone') as string),
        organization: (update.organization as string) ?? (doc.get('organization') as string),
        notes: (update.notes as string) ?? (doc.get('notes') as string),
      });
    }
    await ref.update(update);
    return this.toClient(await ref.get());
  }

  async delete(_uid: string, id: string): Promise<void> {
    const ref = this.collection().doc(id);
    await this.firestore.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        throw new NotFoundError('Client');
      }
      const count = doc.get('workOrderCount') as number;
      if (count > 0) {
        throw new ConflictError('Cannot delete a client linked to work orders');
      }
      tx.delete(ref);
    });
  }

  async findById(_uid: string, id: string): Promise<Client | null> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) return null;
    return this.toClient(doc);
  }

  async exists(_uid: string, id: string): Promise<boolean> {
    const doc = await this.collection().doc(id).get();
    return doc.exists;
  }

  async findMany(
    _uid: string,
    filter: ClientFilter,
  ): Promise<{ items: Client[]; nextCursor?: string }> {
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    let query: FirebaseFirestore.Query = this.collection().orderBy('updatedAt', 'desc').limit(limit);

    if (filter.organization) {
      query = query.where('organization', '==', filter.organization.trim());
    }

    if (filter.search) {
      const prefix = filter.search.toLowerCase().trim();
      query = query.where('searchPrefixes', 'array-contains', prefix);
    }

    if (filter.cursor) {
      const cursorDoc = await this.collection().doc(filter.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => this.toClient(doc));
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : undefined;
    return { items, nextCursor };
  }
}
