## Context

See `proposal.md` for motivation and the delta specs for behavioral requirements. The web workspace is an Astro 5 static application with React 18 islands and Tailwind CSS 3. Its feature pages render through `components/layout/Protected.tsx` and `components/layout/AppShell.tsx`, but obsolete alternatives remain under `components/auth`, authentication state is implemented more than once, and visual styles are repeated as long utility strings in feature components.

The current quality baseline is split: the Astro production build passes, while the web test suite depends on the configured local API, web typecheck reports boundary and component errors, and root lint cannot validate `packages/shared`. The reference site at `ijac.com.ar` is a dark-only Next.js marketing application using Inter, Space Grotesk, an optional SphereFez brand face, CSS-variable color tokens, dark neutral surfaces, cyan/blue and purple gradients, rounded glass navigation, Lucide-style icons, and Motion transitions. Those design properties are the reference; its framework, public-site information architecture, and high-motion marketing patterns are not.

## Goals / Non-Goals

**Goals:**

- Establish a green, deterministic quality baseline before the page-level redesign begins.
- Provide one authentication boundary and one responsive application shell.
- Translate the iJac brand language into semantic tokens and reusable operations-oriented primitives.
- Make interaction states accessible and consistent across the existing feature surfaces.
- Preserve business requests, routes, Firebase behavior, and server contracts during migration.

**Non-Goals:**

- Reproduce the public site's page composition, typewriter hero, floating marketing widgets, or content sections.
- Adopt Next.js, Tailwind CSS 4, React Server Components, or the public site's deployment model.
- Complete the final information architecture and page-level UX redesign in this change.
- Change API payloads, Firestore data, Firebase authorization, or Google Calendar synchronization rules.

## Decisions

### Stabilize behavior before migrating presentation

First isolate network tests, fix strict typing, and restore lint ownership. Then consolidate the shell and migrate presentation. This produces a trustworthy regression signal before shared primitives affect every page.

Alternative considered: redesign components while fixing errors opportunistically. Rejected because failures would be difficult to attribute and duplicated components could cause the same visual work to be performed twice.

### Port the brand system, not the reference implementation

Recreate the reference site's design language through this project's Tailwind 3 configuration and CSS variables. Use semantic roles such as background, panel, border, foreground, muted, primary, destructive, status, priority, focus, and gradient instead of copying Next.js component markup or framework-specific utilities.

Alternative considered: copy the reference site's shadcn and Tailwind 4 setup. Rejected because it would introduce a framework migration unrelated to the user-visible goal and would increase risk before the current gates are green.

### Use an operations-oriented dark composition

Keep black and near-black as dominant surfaces, subtle white borders and restrained glass effects for hierarchy, and cyan/blue gradients for primary actions or active navigation. Purple remains a secondary accent. Status and priority colors retain their domain meaning and are paired with labels or icons. The shell uses the iJac logo and a compact glass header on desktop with an accessible menu treatment on mobile rather than the public site's anchor-navigation layout.

Alternative considered: apply gradients and animation to every card and control to mirror the marketing site literally. Rejected because dense operational interfaces require lower visual noise and faster state recognition.

### Self-host the established typography

Use Inter for body copy and Space Grotesk for headings through self-hosted font packages or approved local assets. Use SphereFez only for the iJac brand lockup when its repository asset is confirmed as owned or licensed for reuse; otherwise keep the lockup in Space Grotesk without delaying the foundation.

Alternative considered: load Google Fonts at runtime. Rejected to avoid a new third-party runtime dependency, layout instability, and privacy/performance variability.

### Build a small native primitive layer

Create typed primitives under `apps/web/src/components/ui` for buttons, form fields, panels, badges, alerts, loading and empty states, and confirmation dialogs. Use `class-variance-authority`, `clsx`, and `tailwind-merge` for controlled variants, `lucide-react` for consistent icon geometry, and `motion` only for transitions that materially clarify state. Do not install or scaffold the full shadcn component set.

Alternative considered: continue composing every control from inline Tailwind strings. Rejected because the current duplication is the primary source of visual drift and makes the later redesign expensive.

### Keep one authentication and shell path

Retain `useAuth` as the single Firebase subscription boundary, retain `components/layout/Protected.tsx` as the route gate, and retain `components/layout/AppShell.tsx` as authenticated chrome. Remove the obsolete auth-level shell, protected wrapper, and `AuthGate` after confirming no callers remain. The shell owns responsive navigation and account actions; feature managers continue owning business data and mutations.

Alternative considered: introduce a new global React context or state library. Rejected because the existing application is small and the current hook already provides the necessary contract.

### Test external boundaries explicitly

Mock `fetch` in API client tests and add explicit cases for network failure, structured API errors, raw successful payloads, and enveloped successful payloads. Component tests exercise observable interaction states rather than Tailwind class snapshots. Quality commands remain the acceptance boundary: root lint, typecheck, tests, and build must all pass without a live API, Firebase session, or developer environment file.

Alternative considered: make the existing API test pass by forcing an invalid URL. Rejected because it would still test environment behavior instead of the API client's response contract.

### Respect reduced motion by construction

Use CSS transitions for simple hover and focus states and Motion for bounded shell, dialog, and state transitions. Every nonessential animation must have a reduced-motion equivalent; continuous decorative motion is excluded from operations pages.

Alternative considered: copy the public site's typewriter and hero animation system. Rejected because it does not help users complete internal tasks and would conflict with reduced-motion and density goals.

## Risks / Trade-offs

- [Risk] Migrating repeated control markup can accidentally change form submission or mutation behavior. -> Mitigation: add boundary tests first, preserve handlers and resource calls, and migrate one feature surface at a time.
- [Risk] A shared primitive layer can become an oversized design system before the real redesign. -> Mitigation: implement only variants required by current screens and defer page-specific compositions.
- [Risk] Font or logo assets from the reference repository may have unclear reuse rights. -> Mitigation: verify iJac ownership or licensing before copying binaries and keep a Space Grotesk/text fallback.
- [Risk] Motion and icon dependencies increase the client bundle. -> Mitigation: import components directly, use Motion only in hydrated React islands, and compare the production build output before and after migration.
- [Risk] Consolidating auth components can expose timing differences in Firebase token loading. -> Mitigation: retain the current `useAuth` contract, test loading/signed-out/signed-in states, and avoid changing token refresh behavior.
- [Trade-off] The app will gain brand consistency but will not yet receive the complete workflow and information-architecture redesign. This intentionally prevents visual redesign from masking foundation defects.

## Migration Plan

1. Capture the failing baseline and add deterministic API/auth regression tests.
2. Fix lint and TypeScript errors without weakening compiler or lint rules.
3. Consolidate the auth gate and application shell, verifying every route after removal of obsolete components.
4. Add approved brand assets, self-hosted fonts, semantic tokens, and the minimal primitive dependencies.
5. Implement primitives and migrate sign-in, shell, clients, work orders, and calendar in bounded work units.
6. Verify keyboard operation, mobile layouts, reduced motion, root quality gates, and production bundle output.

Rollback is commit-oriented: revert the latest migrated feature surface first, then primitives/tokens, then shell consolidation. No persisted data, API, or environment migration is required.
