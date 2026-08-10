## Context

The work-order form already uses a native date input and shared Select/Input primitives. Status and priority currently receive implicit defaults, so the UI does not require an intentional selection. See `proposal.md` and the work-order-management delta spec for the behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Make the native calendar picker easy to open with pointer or keyboard interaction.
- Require explicit status and priority selections for new work orders.
- Preserve existing values while editing and keep the current API value set.

**Non-Goals:**
- Add a third-party calendar package or custom date parsing.
- Change work-order persistence, DTO values, or due-date optionality.
- Redesign unrelated form fields or the surrounding orders page.

## Decisions

### Use the native date picker with an explicit trigger

Keep `input type="date"` as the source of truth and expose its `showPicker()` capability through a labeled calendar button when supported. The input remains directly editable and provides the fallback when `showPicker()` is unavailable. This avoids dependency weight and retains platform localization and accessibility.

Alternative considered: add a custom calendar library. Rejected because the requirement does not need range selection, disabled-date rules, or other behavior that justifies additional bundle and accessibility complexity.

### Represent unselected required choices as empty strings

New forms initialize status and priority to empty values and display disabled prompt options. Local validation reports field-specific errors before any API call. Edit forms continue to initialize from the persisted values.

Alternative considered: retain defaults and only add the HTML `required` attribute. Rejected because a preselected default does not require an intentional user choice.

### Forward the shared input ref

Expose the native input through the shared Input component with `forwardRef`, allowing the work-order form to open the calendar without document queries. Existing Input props and rendering remain unchanged.

## Risks / Trade-offs

- [Browser support for `showPicker()` varies] → Keep the native date input fully operable and focus it when the method is unavailable.
- [Explicit status and priority add two selections to order creation] → Use clear prompt options and inline errors; edits remain prefilled.
- [Changing Input to `forwardRef` touches a shared primitive] → Preserve its public props and run the complete frontend test and typecheck suites.
