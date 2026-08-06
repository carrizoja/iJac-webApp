## Why

iJac IT Solutions needs a secure internal system to manage clients and work orders without relying on disconnected tools. Building the MVP on a production-oriented monorepo also establishes the code quality, testing, and CI foundations required for the application to serve as a credible portfolio project and evolve safely.

## What Changes

- Establish a pnpm and Turborepo monorepo with an Astro/React/Tailwind web app, a NestJS API, and shared TypeScript domain contracts.
- Add Google sign-in through Firebase Authentication and authorize NestJS API requests by validating Firebase ID tokens server-side.
- Add authenticated CRUD and basic search/filter workflows for clients.
- Add authenticated CRUD and list workflows for work orders linked to clients, including status, priority, and due-date tracking.
- Add an internal calendar view of work-order due dates and Google Calendar synchronization, with the initial synchronization direction selected and documented during design.
- Add a GitHub Actions CI workflow that lints, typechecks, and builds all workspace applications on pushes and pull requests.
- Exclude invoicing, external client access, notifications, role-based permissions, attachments, deployment automation, and relational persistence from this MVP.

## Capabilities

### New Capabilities

- `monorepo-foundation`: Workspace structure, shared TypeScript contracts, development tooling, and coordinated builds for the web and API applications.
- `user-authentication`: Google sign-in, Firebase session identity, API token validation, and secure acquisition and storage of Google OAuth credentials for Calendar access.
- `client-management`: Authenticated creation, retrieval, update, deletion, listing, search, and filtering of client records.
- `work-order-management`: Authenticated creation, retrieval, update, deletion, and listing of work orders linked to clients.
- `calendar-integration`: Internal due-date calendar presentation and synchronization of eligible work orders with Google Calendar.
- `continuous-integration`: Automated lint, typecheck, and build validation for both applications on pushes and pull requests.

### Modified Capabilities

None.

## Impact

- Introduces `apps/web`, `apps/api`, and `packages/shared` plus root pnpm/Turborepo configuration.
- Introduces Firebase Authentication, Firestore, Firebase Admin SDK, Google OAuth/Calendar API, Astro, React, Tailwind CSS, NestJS, and validation dependencies.
- Adds Firestore collections for application data and protected OAuth credentials, with supporting indexes and security rules.
- Adds authenticated REST API endpoints consumed by the web application.
- Adds `.github/workflows/ci.yml`; deployment to Vercel and Railway remains a separate future change.
