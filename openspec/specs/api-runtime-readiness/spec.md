# api-runtime-readiness Specification

## Purpose
Defines the observable guarantees that make the API buildable, startable, diagnosable, and verifiably ready to serve requests.
## Requirements
### Requirement: API build is deterministic
The API source SHALL pass its configured typecheck and production build commands without compilation errors or indefinite execution.

#### Scenario: Clean API verification
- **WHEN** a developer or CI system runs the API typecheck and production build commands in an installed workspace
- **THEN** both commands complete successfully with exit code zero

#### Scenario: Compilation failure
- **WHEN** the API contains a compilation error
- **THEN** the affected verification command terminates with a non-zero exit code and reports the error

### Requirement: API startup reports readiness
The API SHALL start with valid required configuration, listen on the configured port, and report its canonical health URL in startup output.

#### Scenario: Successful local startup
- **WHEN** the API start command runs with valid required environment configuration
- **THEN** the process remains running and reports that `GET /api/health` is available on the configured port

### Requirement: Invalid startup configuration fails clearly
The API MUST reject missing or invalid required environment configuration before accepting requests and MUST expose an actionable validation error in process output.

#### Scenario: Required variable is missing
- **WHEN** the API start command runs without a required environment variable
- **THEN** the process terminates with a non-zero exit code and identifies the invalid or missing variable

### Requirement: Public health check exposes service status
The API SHALL expose `GET /api/health` without authentication and return a successful JSON readiness response containing status `ok` and a valid timestamp.

#### Scenario: Unauthenticated health request
- **WHEN** a client sends `GET /api/health` without an authorization token after startup completes
- **THEN** the API responds with HTTP 200 and a JSON body containing status `ok` and an ISO 8601 timestamp

### Requirement: Runtime readiness is automatically verified
The API test suite SHALL verify the health-check contract and startup-critical environment validation without requiring live Firebase or Google network access.

#### Scenario: Readiness tests run in isolation
- **WHEN** the API readiness tests run in the test environment
- **THEN** they validate successful health responses and invalid-configuration rejection using controlled local dependencies

