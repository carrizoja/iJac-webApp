## Why

The current signed-out experience is a minimal centered heading and Google button, so it does not communicate the polished, trustworthy product identity established by the iJac brand foundation. The login should adopt the focused admin-access composition of `josecarrizo-dev.com/login` while retaining iJac-owned branding and the application's existing Firebase Google authentication contract.

## What Changes

- Replace the minimal sign-in surface with a dedicated full-viewport login composition inspired by the reference page: centered identity block, elevated access panel, restrained supporting copy, and a quiet footer treatment.
- Apply the approved iJac logo, semantic dark surfaces, cyan/blue accents, gradients, typography, radii, borders, shadows, and focus styles already derived from `ijac.com.ar`.
- Preserve Google-only Firebase authentication and the requested Calendar scope; do not introduce unsupported email/password fields or alter API authorization.
- Provide responsive desktop and mobile layouts, visible keyboard focus, reduced-motion behavior, accessible loading and error feedback, and touch targets of at least 44 by 44 CSS pixels.
- Add component and Playwright coverage for the signed-out page's brand identity, primary action, pending/error behavior, responsive composition, and absence of horizontal overflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-experience-foundation`: Extend the shared visual and accessibility contract to cover a dedicated branded signed-out access experience across supported viewports.

## Impact

- Primary implementation areas: `apps/web/src/components/auth/SignIn.tsx`, shared UI primitives where required, `apps/web/src/styles/global.css`, and approved assets under `apps/web/public/ijac/`.
- Test impact: focused React component tests and Playwright browser coverage under `apps/web/e2e/`.
- Authentication, Firebase configuration, Google Calendar scope, protected-route behavior, API endpoints, and persisted data remain unchanged.
- No new production dependency is expected; existing Tailwind CSS, Lucide React, Framer Motion, semantic tokens, and Playwright infrastructure are sufficient.
