## Context

See `proposal.md` for motivation and `specs/client-management/spec.md` for required behavior. `FirestoreClientRepository.findMany` implements search with `searchPrefixes array-contains <normalized-term>` while ordering by `updatedAt DESC`. Firestore requires a composite index for that query shape. The matching declaration already exists in `firestore.indexes.json`, but `firebase.json` currently configures only emulators, so the repository does not expose its rules and index files to standard Firebase deployment commands.

The browser and public API contract are behaving as designed: the browser sends the search query, and the repository attempts the intended indexed query. The repair belongs at the datastore provisioning boundary rather than in client-side error suppression or an alternate in-memory search path.

## Goals / Non-Goals

**Goals:**

- Make Firestore rules and composite indexes explicit deployable resources in the root Firebase configuration.
- Keep the existing case-insensitive prefix query, `updatedAt DESC` ordering, and cursor behavior aligned with the declared client index.
- Add regression coverage that fails if the searched query shape drifts away from the index definition.
- Give operators a repeatable deployment and verification procedure for each Firebase project.

**Non-Goals:**

- Changing the `GET /api/clients` contract, search UX, debounce behavior, or error presentation.
- Replacing prefix search with full-text, fuzzy, tokenized, or third-party search.
- Automatically deploying Firebase resources from CI or introducing deployment credentials.
- Backfilling `searchPrefixes` for legacy client documents; that is a separate data concern if such records are discovered.

## Decisions

### Register existing Firestore resources in `firebase.json`

Add the default Firestore database configuration with `rules: "firestore.rules"` and `indexes: "firestore.indexes.json"`. This makes `firebase deploy --only firestore:indexes` and `firebase deploy --only firestore:rules` operate on the versioned files already maintained by the repository.

Alternative considered: ask operators to create the index from the runtime error's console link. Rejected because manual console state is not reviewable, repeatable, or reliably reproduced across environments.

### Preserve the existing indexed query

Keep `array-contains` on normalized `searchPrefixes` together with `updatedAt DESC`. The implementation already matches the declared composite index and the client-management ordering contract; removing the ordering or fetching all clients for in-memory filtering would weaken behavior and scale poorly.

Alternative considered: catch the Firestore missing-index error and retry without ordering. Rejected because it hides environment drift, changes result order, complicates pagination, and leaves production incorrectly provisioned.

### Test query construction and resource alignment

Add focused tests around `FirestoreClientRepository.findMany` using a Firestore query test double. Assert that a normalized search applies `where('searchPrefixes', 'array-contains', term)`, preserves descending `updatedAt` ordering, respects the page limit, and maps empty results without error. Add a lightweight assertion that the Firebase configuration points to the versioned rules and index files and that the client composite index contains the same fields and modes as the repository query.

Alternative considered: rely only on `ClientService` tests. Rejected because those tests use an in-memory repository and cannot detect Firestore query or provisioning regressions.

### Document deployment as an explicit environment step

Document selecting the intended Firebase project, deploying indexes, and checking them with `firebase firestore:indexes`. The procedure must note that index creation is asynchronous and search verification should wait until the composite index reports ready.

Alternative considered: add automatic deployment to the existing CI workflow. Rejected because this repository intentionally has no deployment pipeline and CI does not own Firebase credentials.

## Risks / Trade-offs

- [The index file is correct but not yet deployed to an affected Firebase project] -> Require the documented deploy and readiness check before considering the runtime repair complete.
- [Composite index creation takes time] -> Treat deployment and index readiness as separate migration steps; do not validate search until Firebase reports the index ready.
- [Repository query fields drift from index configuration later] -> Keep a focused alignment test that names both `searchPrefixes` and `updatedAt DESC`.
- [A different Firebase project is selected accidentally] -> Require an explicit project identifier in deployment examples and verify the active project before deployment.
- [Legacy documents lack `searchPrefixes`] -> Existing clients without the field remain absent from prefix results; record this as a follow-up migration only if production data confirms the condition.

## Migration Plan

1. Add the Firestore rules and index paths to `firebase.json`; run configuration and repository tests locally.
2. Select the affected Firebase project explicitly and deploy with `firebase deploy --only firestore:indexes,firestore:rules --project <project-id>`.
3. Run `firebase firestore:indexes --project <project-id>` and wait until the `clients` composite index for `searchPrefixes` plus descending `updatedAt` is ready.
4. Verify authenticated requests for a matching term and a non-matching term return HTTP 200 with ordered and empty result sets respectively.
5. Roll back application code normally if necessary. Do not immediately delete the composite index during rollback because the current released repository query also depends on it; remove it only after no deployed version uses that query shape.
