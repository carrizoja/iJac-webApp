## Why

Creating a work order should make scheduling fast and prevent ambiguous status or priority data. The current form relies on implicit default values and a basic date field without clearly enforcing the required business choices.

## What Changes

- Provide an accessible calendar date picker for the work-order due date so users can select a date quickly.
- Require users to explicitly provide valid status and priority values when creating or editing a work order.
- Add form validation and regression coverage for date selection and required status and priority fields.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `work-order-management`: Make status and priority explicit required form inputs and provide fast calendar-based due-date selection.

## Impact

- Affects the React work-order form and its component tests.
- Preserves the existing work-order API payload values and optional due-date contract.
- Uses native browser date selection to avoid adding a new dependency while retaining keyboard and screen-reader support.
