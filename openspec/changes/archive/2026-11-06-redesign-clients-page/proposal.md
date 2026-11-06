## Why

The Clients page currently exposes the correct CRUD workflow but presents it as a generic utility screen. The provided iJac reference uses a stronger editorial composition, with breadcrumb context, a large bordered hero panel, a green status pill, oversized heading, muted supporting copy, and high-contrast gradient/outline actions. Applying that visual language will make client management feel like a deliberate iJac product surface rather than an unstyled data form.

## What Changes

- Recompose the Clients page around the screenshot's dark editorial layout: breadcrumb, introductory pill, oversized page heading, supporting copy, and a large rounded bordered content panel.
- Apply the same iJac button language from the reference: bright gradient or accent-outline primary action, restrained secondary outline action, consistent radii, focus rings, hover states, and touch sizing.
- Apply the established iJac dark palette, cyan/blue and green accent treatment, typography hierarchy, subtle borders, gradients, and restrained atmosphere through semantic tokens.
- Restyle client search, create/edit form, client cards, empty/loading/error states, and deletion confirmation so they belong to the same visual system.
- Preserve all existing client list, search, create, update, delete, validation, authorization, and API request behavior.
- Add responsive and browser coverage for the page hierarchy, button treatments, mobile layout, keyboard focus, and no horizontal overflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-experience-foundation`: Extend the branded visual and responsive interaction contract to cover the Clients page editorial composition and reference-aligned button treatment.

## Impact

- Primary implementation areas: `apps/web/src/pages/clients/index.astro`, `apps/web/src/components/clients/ClientManager.tsx`, `ClientList.tsx`, `ClientForm.tsx`, and shared semantic styles or primitives where required.
- Test impact: existing ClientForm coverage plus new Clients page/component and Playwright browser assertions.
- Client API contracts, Firebase authorization, persisted data, validation rules, deletion integrity, and resource calls remain unchanged.
- No new production dependency or external asset is required; the screenshot is a visual reference only and the implementation uses existing iJac-owned tokens and assets.
