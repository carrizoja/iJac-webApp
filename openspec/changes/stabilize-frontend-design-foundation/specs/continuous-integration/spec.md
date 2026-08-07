## MODIFIED Requirements

### Requirement: Complete workspace quality gates
The CI workflow SHALL run lint, typecheck, deterministic tests, and production build tasks for both `apps/web` and `apps/api` through the root workspace commands.

#### Scenario: All checks pass
- **WHEN** lint, typecheck, test, and build tasks succeed for every required workspace
- **THEN** the CI workflow completes successfully

#### Scenario: A workspace check fails
- **WHEN** any required lint, typecheck, test, or build task fails
- **THEN** the CI workflow fails and identifies the failed task and workspace in its logs

#### Scenario: Run frontend tests in an isolated environment
- **WHEN** CI runs the web test suite without a live API, Firebase session, or developer `.env` file
- **THEN** the tests use controlled local boundaries and terminate with deterministic results
