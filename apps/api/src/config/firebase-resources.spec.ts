import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FirebaseConfig {
  firestore?: {
    rules?: string;
    indexes?: string;
  };
}

interface FirestoreIndexes {
  indexes: Array<{
    collectionGroup: string;
    fields: Array<{
      fieldPath: string;
      arrayConfig?: string;
      order?: string;
    }>;
  }>;
}

const workspaceRoot = resolve(__dirname, '../../../..');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('Firebase resources', () => {
  it('registers existing Firestore rules and index files', () => {
    const config = readJson<FirebaseConfig>(resolve(workspaceRoot, 'firebase.json'));

    expect(config.firestore).toEqual({
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json',
    });
    expect(existsSync(resolve(workspaceRoot, config.firestore?.rules ?? ''))).toBe(true);
    expect(existsSync(resolve(workspaceRoot, config.firestore?.indexes ?? ''))).toBe(true);
  });

  it('defines the composite index required by client prefix search', () => {
    const config = readJson<FirebaseConfig>(resolve(workspaceRoot, 'firebase.json'));
    const indexes = readJson<FirestoreIndexes>(
      resolve(workspaceRoot, config.firestore?.indexes ?? ''),
    );
    const clientSearchIndex = indexes.indexes.find(
      (index) => index.collectionGroup === 'clients',
    );

    expect(clientSearchIndex?.fields).toEqual([
      { fieldPath: 'searchPrefixes', arrayConfig: 'CONTAINS' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' },
    ]);
  });
});
