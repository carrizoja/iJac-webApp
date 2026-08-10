## Why

Searching from "Buscar clientes..." currently sends `GET /api/clients?search=<term>`, but the API returns HTTP 500 instead of matching clients or an empty result. The Firestore query depends on a composite index that is declared in the repository but is not registered in the Firebase project configuration or supported by a documented deployment and verification workflow.

## What Changes

- Make the Firestore client-search index and security rules deployable through the repository's Firebase configuration.
- Preserve case-insensitive prefix search and most-recently-updated ordering without returning an internal server error for valid search terms.
- Add repository-level regression coverage for searched client queries and their ordering/pagination constraints.
- Document how to deploy and verify Firestore indexes so environment setup cannot silently omit this runtime dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-management`: Strengthen client search behavior so valid searches reliably return matching or empty results when the application is deployed with its required Firestore resources.

## Impact

- Affects `firebase.json`, the existing `firestore.indexes.json` deployment path, Firebase environment setup documentation, and the Firestore client repository test surface.
- Does not change the public `GET /api/clients` request or response contract.
- Requires provisioning the declared composite index in each Firebase project used by the application.
