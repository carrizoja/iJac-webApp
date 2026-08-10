## 1. Firestore Resource Configuration

- [x] 1.1 Register `firestore.rules` and `firestore.indexes.json` for the default database in `firebase.json` while preserving emulator configuration.
- [x] 1.2 Add a configuration regression test that verifies the registered files exist and the client composite index defines `searchPrefixes` as `CONTAINS` followed by `updatedAt` descending.

## 2. Client Search Regression Coverage

- [x] 2.1 Add focused `FirestoreClientRepository.findMany` tests for normalized prefix filtering, descending update order, page limits, and empty search results.
- [x] 2.2 Run the API unit tests, typecheck, and lint checks and resolve any failures introduced by the new coverage.

## 3. Deployment And Runtime Verification

- [x] 3.1 Document explicit-project commands for deploying Firestore rules and indexes, listing deployed indexes, and waiting for index readiness.
- [x] 3.2 Deploy the versioned Firestore rules and indexes to the affected Firebase project and confirm the client search composite index reports ready.
- [x] 3.3 Verify authenticated matching and non-matching `GET /api/clients?search=<term>` requests return HTTP 200 with ordered results or an empty result set.
