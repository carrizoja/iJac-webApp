## 1. Establish Deterministic Regression Coverage

- [x] 1.1 Mock `fetch` in the web API client tests and cover network failure, structured API errors, raw successful payloads, and enveloped successful payloads without reading the developer `.env` file
- [x] 1.2 Add focused tests for the shared authentication hook and protected-route loading, signed-out, signed-in, token-failure, and unsubscribe behavior
- [x] 1.3 Add behavior-first coverage for action pending states, form validation feedback, loading and empty states, and destructive cancellation before migrating presentation

## 2. Restore Frontend Quality Gates

- [x] 2.1 Replace the web environment module's unavailable validator imports with a typed browser-safe validation boundary and verify missing or invalid public values fail clearly
- [x] 2.2 Add structural API error narrowing so malformed error payloads cannot be cast directly to the expected error contract
- [x] 2.3 Correct Firebase user state typing, stale component imports, work-order status and priority form typing, and all current unused declarations without weakening TypeScript settings
- [x] 2.4 Add repository-owned ESLint 9 configuration and dependencies for `packages/shared`, then align web lint parsing for TypeScript, React, Astro, hooks, and accessibility rules
- [x] 2.5 Run focused web tests, web typecheck, web lint, and shared lint and resolve every remaining diagnostic before structural UI work begins

## 3. Consolidate Authentication and Application Chrome

- [x] 3.1 Make `useAuth` the single Firebase authentication subscription and preserve its user, token, loading, and error contract
- [x] 3.2 Keep one protected route wrapper under `components/layout`, add accessible loading and authentication error feedback, and migrate all Astro pages to that wrapper
- [x] 3.3 Keep one authenticated `AppShell` under `components/layout`, centralize navigation metadata and account actions, and expose the current destination
- [x] 3.4 Remove the obsolete auth-level `AppShell`, `Protected`, and `AuthGate` implementations after confirming no callers remain
- [x] 3.5 Verify signed-out, signed-in, sign-out, desktop navigation, and mobile navigation behavior with focused tests

## 4. Introduce the iJac Brand Foundation

- [x] 4.1 Verify ownership or license of the reference logo and SphereFez assets, copy only approved assets, and document the Space Grotesk fallback
- [x] 4.2 Add self-hosted Inter and Space Grotesk, class-variant, class-merging, icon, and motion dependencies and update the frozen lockfile
- [x] 4.3 Define semantic CSS variables and Tailwind aliases for backgrounds, panels, borders, foregrounds, muted content, cyan/blue primary gradients, purple accents, destructive actions, focus, status, and priority
- [x] 4.4 Define shared typography, radius, shadow, glass-surface, focus-visible, and reduced-motion conventions in the global style layer
- [x] 4.5 Verify that base styles render without horizontal overflow and retain sufficient contrast at mobile and desktop breakpoints

## 5. Build Accessible Interaction Primitives

- [x] 5.1 Add a typed class-merging utility and Button primitive with primary gradient, secondary, ghost, and destructive variants plus size, icon, disabled, and pending behavior
- [x] 5.2 Add shared input, select, textarea, label, help-text, and field-error primitives with stable identifier and accessibility relationships
- [x] 5.3 Add panel, badge, alert, loading-state, and empty-state primitives that express operational meaning without color alone
- [x] 5.4 Add an accessible confirmation dialog with focus entry, cancellation, Escape handling, destructive pending state, and focus restoration
- [x] 5.5 Add bounded shell, dialog, and state transitions with reduced-motion equivalents and no continuous decorative animation

## 6. Migrate Existing Feature Surfaces

- [x] 6.1 Migrate sign-in and authentication loading/error states to the brand tokens and shared interaction primitives
- [x] 6.2 Migrate the consolidated desktop and mobile application shell to the approved logo, typography, glass surface, active navigation, icons, and account controls
- [x] 6.3 Migrate client list, search, form, mutation feedback, empty state, and deletion confirmation without changing resource calls
- [x] 6.4 Migrate work-order list, filters, status and priority badges, form controls, mutation feedback, empty state, and deletion confirmation without changing resource calls
- [x] 6.5 Migrate calendar navigation, event states, Google Calendar connection, synchronization progress, success, failure, and retry feedback without changing synchronization contracts

## 7. Complete Verification

- [x] 7.1 Run all web and shared tests and confirm they pass without a live API, Firebase session, Google service, or developer `.env` file
- [x] 7.2 Run root lint and typecheck and resolve every diagnostic without disabling required rules or weakening compiler settings
- [x] 7.3 Run the production build, compare client bundle output for new dependency regressions, and verify all four static routes are generated
- [x] 7.4 Verify keyboard-only operation, visible focus, labels and errors, dialog focus management, semantic state cues, reduced motion, and mobile layouts across authentication and every operations page
- [x] 7.5 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from the workspace root and record the exact successful results for implementation verification
