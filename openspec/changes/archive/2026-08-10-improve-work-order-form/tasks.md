## 1. Calendar Date Selection

- [x] 1.1 Forward native input refs through the shared Input primitive without changing its existing API behavior.
- [x] 1.2 Add an accessible calendar trigger to the work-order due-date field with a native-input fallback.

## 2. Required Work-Order Choices

- [x] 2.1 Require explicit status and priority selections for new work orders while preserving values during editing.
- [x] 2.2 Add field-level validation and accessible error presentation for missing status and priority.

## 3. Verification

- [x] 3.1 Add component tests for opening the calendar, rejecting missing required choices, and submitting valid selections.
- [x] 3.2 Run frontend tests, typecheck, lint, and production build.
