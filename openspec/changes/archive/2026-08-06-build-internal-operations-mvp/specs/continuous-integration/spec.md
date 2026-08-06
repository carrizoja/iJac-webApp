## ADDED Requirements

### Requirement: Push and pull-request validation
The repository SHALL run a GitHub Actions CI workflow for every pull request and for every push to configured repository branches.

#### Scenario: Open or update a pull request
- **WHEN** a pull request is opened or receives new commits
- **THEN** GitHub Actions installs the pinned pnpm toolchain and workspace dependencies before running repository validation

### Requirement: Complete workspace quality gates
The CI workflow SHALL run lint, typecheck, and production build tasks for both `apps/web` and `apps/api` through the root workspace commands.

#### Scenario: All checks pass
- **WHEN** lint, typecheck, and build tasks succeed for every required workspace
- **THEN** the CI workflow completes successfully

#### Scenario: A workspace check fails
- **WHEN** any required lint, typecheck, or build task fails
- **THEN** the CI workflow fails and identifies the failed task and workspace in its logs

### Requirement: Reproducible dependency installation
The CI workflow SHALL install dependencies using the committed lockfile without allowing dependency resolution to modify it.

#### Scenario: Lockfile does not match manifests
- **WHEN** package manifests and the committed pnpm lockfile are inconsistent
- **THEN** dependency installation fails before validation tasks run

### Requirement: No deployment side effects
The MVP CI workflow SHALL NOT deploy either application or require Vercel or Railway production credentials.

#### Scenario: CI succeeds
- **WHEN** all quality gates pass on a push or pull request
- **THEN** the workflow reports success without invoking a deployment provider
