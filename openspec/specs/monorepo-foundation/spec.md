## Purpose

Define the workspace structure, shared contracts, environment boundaries, and local development foundation.
## Requirements
### Requirement: Workspace organization
The project SHALL use a pnpm workspace coordinated by Turborepo, with the Astro web application in `apps/web`, the NestJS API in `apps/api`, and reusable TypeScript contracts in `packages/shared`.

#### Scenario: Install workspace dependencies
- **WHEN** a developer runs the root workspace install command
- **THEN** pnpm resolves dependencies for both applications and the shared package from one lockfile

#### Scenario: Run coordinated validation
- **WHEN** a developer runs a root lint, typecheck, or build command
- **THEN** Turborepo executes the corresponding task for every affected workspace package

### Requirement: Web application foundation
The web workspace SHALL provide an Astro application using React islands and Tailwind CSS, with authenticated application pages that remain usable on desktop and mobile viewports and use the shared iJac brand-aligned frontend foundation.

#### Scenario: Render the application shell
- **WHEN** an authenticated user opens the web application
- **THEN** the system renders responsive navigation to clients, work orders, and calendar views using the shared iJac typography, surface, action, focus, and motion conventions

### Requirement: API application foundation
The API workspace SHALL provide a NestJS application with configuration validation, global request validation, and feature modules for authentication, clients, work orders, and calendar synchronization.

#### Scenario: Start with valid configuration
- **WHEN** the API starts with all required environment values
- **THEN** it exposes its configured HTTP endpoints and health status

#### Scenario: Reject invalid configuration
- **WHEN** the API starts without a required environment value
- **THEN** startup fails with a configuration error that identifies the missing value

### Requirement: Shared domain contracts
The shared package SHALL export framework-independent TypeScript contracts for `Client`, `WorkOrder`, `User`, and `CalendarEvent` plus the work-order status and priority values.

#### Scenario: Consume shared contracts
- **WHEN** the web and API workspaces compile
- **THEN** both consume the same domain contract definitions from the shared package without importing framework-specific code

