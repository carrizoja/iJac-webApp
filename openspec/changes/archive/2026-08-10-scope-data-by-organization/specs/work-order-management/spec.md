## ADDED Requirements

### Requirement: Organization-scoped work-order management
The system SHALL create, retrieve, list, filter, update, and delete work orders only within the authenticated caller's authorized organization. Every client relationship and client summary used by a work order SHALL resolve within that same organization.

#### Scenario: Create an order for an organization client
- **WHEN** an authorized organization member submits valid work-order data linked to a client in the same organization
- **THEN** the system creates the work order in that organization and transactionally updates that client's work-order count

#### Scenario: Link a client from another organization
- **WHEN** an authorized organization member submits a work order whose `clientId` exists only in another organization
- **THEN** the system returns a not-found response, creates no work order, and changes no client count

#### Scenario: List organization work orders
- **WHEN** an authorized organization member lists or filters work orders
- **THEN** the system returns only work orders in that organization with client summaries resolved from the same organization

#### Scenario: Reassign an order across organizations
- **WHEN** an authorized organization member attempts to reassign a work order to a client identifier that exists only in another organization
- **THEN** the system rejects the update and leaves the work order and both organizations' client counts unchanged

#### Scenario: Load organization work orders for calendar behavior
- **WHEN** the system retrieves work orders for an authorized member's calendar operation
- **THEN** it considers only work orders and client summaries from that member's authorized organization
