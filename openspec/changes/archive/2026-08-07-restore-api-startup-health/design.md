## Context

See `proposal.md` for motivation. The NestJS API already defines a public health controller and validates environment variables during module initialization, but compile-time and build configuration defects currently prevent reliable startup. The observed defects span production imports, Firestore model conversions, unused strict-mode symbols, test mock typing, and build output root mismatch (`dist/src/main.js` generated instead of `dist/main.js`). Both startup and production build commands can remain active without useful output while the typecheck reports underlying errors.

The API must keep its current NestJS, Firebase Admin, Google API, pnpm, and Turborepo stack. The existing `/api` global prefix and `GET /api/health` route remain the external contract.

## Goals / Non-Goals

**Goals:**

- Restore a clean API typecheck and production build before debugging runtime behavior.
- Keep startup configuration validation fail-fast and make its failures visible to operators.
- Verify actual HTTP readiness through the existing public health route.
- Add focused regression tests that do not depend on external services.

**Non-Goals:**

- Reconfigure Firebase Authentication or the web application's Google sign-in flow.
- Change business endpoints, Firestore schemas, OAuth behavior, or health response fields.
- Replace the current framework, package manager, or environment validation library.
- Introduce a production monitoring platform or dependency-level readiness probes.

## Decisions

### Fix compilation before changing runtime orchestration

Resolve production compile errors first, then test build and startup behavior. This separates static defects from runtime configuration failures and avoids adding scripts that merely hide compiler output.

Alternative considered: wrap the existing start command with a timeout or custom launcher. Rejected because it would mask the source defects and introduce another process layer without fixing the API.

### Preserve one canonical public readiness endpoint

Keep `GET /api/health` public and use it for local and automated readiness checks. Startup output will identify the health URL, while tests will exercise the route through Nest's HTTP adapter.

Alternative considered: add separate liveness and readiness endpoints. Rejected because the current requirement is process readiness only; dependency health semantics are not yet defined.

### Test startup-critical behavior with controlled configuration

Add focused tests for environment validation and the health controller/application route. Tests will provide deterministic configuration and avoid contacting Firebase or Google. Runtime smoke verification will start the built API with valid local configuration, poll the health endpoint with a bounded timeout, and terminate the child process cleanly.

Alternative considered: test readiness only through unit tests. Rejected because unit tests cannot prove that the compiled application boots, binds a port, and serves the globally prefixed route.

### Correct strict typing at boundaries instead of weakening TypeScript

Fix relative imports, timestamp conversion types, nullable fields, unused declarations, and mock signatures at their source. Keep strict compiler checks enabled.

Alternative considered: relax `noUnusedLocals`, add broad casts, or exclude failing tests from typecheck. Rejected because those changes would conceal real production and regression-test defects.

## Risks / Trade-offs

- [Risk] Fixing Firestore boundary types may reveal mismatches in shared domain models beyond the first compiler pass. -> Mitigation: preserve serialized API shapes and add focused repository conversion tests where behavior changes could regress.
- [Risk] A smoke test that starts a process can become flaky or leak ports. -> Mitigation: use an ephemeral port, a bounded readiness deadline, and guaranteed process cleanup.
- [Risk] Valid-looking credentials can still fail only when an external service is called. -> Mitigation: scope startup readiness to validated configuration and HTTP availability; external dependency health is explicitly excluded.
- [Trade-off] The health endpoint proves the process can serve HTTP, not that Firebase or Google are reachable. This keeps the check deterministic and suitable for local development and CI.

## Migration Plan

1. Correct compile errors in production and test sources while preserving API behavior.
2. Add focused environment and health tests, then add the built-process smoke verification.
3. Run API typecheck, tests, production build, and readiness smoke check locally and in CI-compatible commands.
4. Document the supported start command and health URL.

Rollback consists of reverting the source and test changes. No persisted data or API migration is required.
