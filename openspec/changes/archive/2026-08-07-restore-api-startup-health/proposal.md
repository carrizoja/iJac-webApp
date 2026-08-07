## Why

The API cannot currently be verified as operational because its typecheck fails and its development and build commands do not complete predictably. Restoring a deterministic startup path and a verifiable health endpoint is required before application features can be developed or tested reliably.

## What Changes

- Correct API compilation errors that prevent a clean typecheck and obscure startup failures.
- Make API build and startup commands complete or fail with actionable output instead of hanging silently.
- Preserve and verify the public `GET /api/health` endpoint as the canonical runtime readiness check.
- Add automated coverage for successful health checks and startup-critical configuration failures.
- Document the supported local command and expected readiness response.

## Capabilities

### New Capabilities

- `api-runtime-readiness`: Defines deterministic API compilation and startup behavior, startup failure reporting, and the public health-check contract.

### Modified Capabilities

None.

## Impact

- Affected code: `apps/api/src`, API test configuration, and API package scripts where needed.
- Affected API: existing public `GET /api/health` endpoint; no breaking response change is intended.
- Affected workflow: local API development, CI typechecking/building, and runtime readiness verification.
- External systems: Firebase and Google credentials remain required for normal API startup, but invalid configuration must fail clearly.
