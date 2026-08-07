## Why

The operations frontend builds but cannot provide a safe base for UX/UI work while its tests, typecheck, and lint gates are failing and its authenticated shell is duplicated. Stabilizing those foundations now also creates the right point to align the application with the established visual language of `ijac.com.ar` without copying its Next.js marketing architecture into the Astro operations product.

## What Changes

- Restore deterministic frontend and workspace quality gates by fixing current type errors, isolating tests from local environment and network state, and adding repository-owned lint configuration where it is missing.
- Consolidate authentication gating, authenticated navigation, and application chrome into one responsive shell before visual migration.
- Replace the provisional dark-slate foundation with brand tokens derived from `ijac.com.ar`: dark neutral surfaces, iJac typography, controlled cyan/blue and purple gradients, consistent radii, focus treatments, shadows, and semantic state colors.
- Add reusable, accessible UI primitives for actions, form controls, panels, badges, alerts, loading and empty states, and destructive confirmation.
- Apply the foundation to the existing sign-in, shell, client, work-order, and calendar interfaces without changing their business contracts.
- Add restrained transitions and feedback animations that respect reduced-motion preferences and remain appropriate for a dense internal operations application.
- Keep Astro, React, Tailwind CSS 3, Firebase, existing routes, and existing API behavior; this change does not migrate the application to Next.js or perform the final page-level UX redesign.

## Capabilities

### New Capabilities

- `frontend-experience-foundation`: Defines the shared iJac visual system, responsive authenticated shell, reusable interaction primitives, accessible state feedback, and motion behavior for the operations frontend.

### Modified Capabilities

- `monorepo-foundation`: Replaces the provisional dark-slate application shell requirement with the established iJac brand-aligned frontend foundation while preserving Astro, React islands, Tailwind, and responsive operation.
- `continuous-integration`: Expands complete workspace quality gates to include deterministic tests and requires frontend tests to run without live API, Firebase, or local `.env` dependencies.

## Impact

- Affected code: `apps/web/src/components`, `apps/web/src/hooks`, `apps/web/src/lib`, `apps/web/src/styles`, web tooling configuration, and `packages/shared` lint configuration.
- Affected assets: approved iJac logo and font assets may be reused from `carrizoja/ijac.com.ar-Next-js` when their ownership or license permits reuse.
- Affected dependencies: focused utilities for class variants, icons, and motion may be added to `apps/web`; no framework migration is planned.
- Affected behavior: visual presentation, responsive navigation, interaction feedback, loading, empty, error, and confirmation states; client, work-order, calendar, authentication, and API contracts remain unchanged.
- Affected workflow: root lint, typecheck, tests, and build must all complete deterministically before the subsequent full UX/UI redesign begins.
