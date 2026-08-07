## 1. Restore Production Compilation and Build Output

- [x] 1.1 Correct startup-critical relative imports in the HTTP exception filter and Firebase module, then verify those modules resolve during typecheck
- [x] 1.2 Correct Firestore timestamp and nullable domain-model conversions in client and work-order repositories without changing serialized API response shapes
- [x] 1.3 Remove unused production imports and declarations reported by strict TypeScript checks
- [x] 1.4 Configure `tsconfig.build.json` and `tsconfig.json` build roots so `nest build` and `nest start` output `dist/main.js` instead of `dist/src/main.js`

## 2. Restore Test Compilation

- [x] 2.1 Type the authentication guard configuration fixture against the API environment contract
- [x] 2.2 Correct calendar service mocks and remove unused test fixtures so strict TypeScript checks accept the test suite
- [x] 2.3 Correct client and work-order repository mock signatures and nullable due-date fixtures

## 3. Verify Runtime Readiness

- [x] 3.1 Add focused tests for complete environment validation and actionable rejection of missing required variables
- [x] 3.2 Add an unauthenticated HTTP test asserting `GET /api/health` returns HTTP 200, status `ok`, and an ISO 8601 timestamp
- [x] 3.3 Add a bounded smoke check that starts the built API on an ephemeral port, waits for `/api/health`, and always terminates the child process
- [x] 3.4 Update startup output and API documentation to identify the supported local start command and canonical health URL

## 4. Complete Verification

- [x] 4.1 Run the API typecheck and resolve all remaining diagnostics without weakening compiler settings
- [x] 4.2 Run the API test suite and production build, confirming each command terminates with the expected exit code and useful failure output
- [x] 4.3 Run the built-process smoke check and confirm the health endpoint is reachable without Firebase or Google network calls

## Additional Fixes (Session 2)

- [x] 4.3.1 Built @ijac/shared package to generate both ESM and CJS exports (added tsconfig.cjs.json and dual build script)
- [x] 4.3.2 Fixed WorkOrderModule export configuration (removed FirestoreWorkOrderRepository from exports, kept only token-based WORK_ORDER_REPOSITORY)
- [x] 4.3.3 Added error handling to main.ts (bootstrap().catch() handler and process.on('unhandledRejection') listener) to surface startup errors in logs
