## Purpose

Define the organization authorization boundary that isolates shared business records and safely adopts existing global data into that boundary.

## ADDED Requirements

### Requirement: Authorized organization context
The system SHALL derive an active organization context from the verified caller identity and server-controlled membership data before executing a business operation. A caller MUST NOT select or override the organization context using an unverified request field.

#### Scenario: Resolve an active membership
- **WHEN** an authenticated caller has an active membership in the organization identified by their server-controlled identity context
- **THEN** the system executes the business operation within that organization

#### Scenario: Caller has no active membership
- **WHEN** an authenticated caller has no active membership for the resolved organization
- **THEN** the system rejects the business operation with a forbidden response and reads or writes no business data

### Requirement: Organization data isolation
The system SHALL store and access clients and work orders within an organization boundary and SHALL prevent a caller from discovering or modifying records outside the caller's authorized organization.

#### Scenario: Request a record from another organization
- **WHEN** an authenticated organization member requests an identifier that exists only in another organization
- **THEN** the system returns a not-found response without revealing that the record exists elsewhere

#### Scenario: List organization records
- **WHEN** an authenticated organization member lists clients or work orders
- **THEN** the system returns only records belonging to that organization

### Requirement: Server-controlled Firestore access
The system SHALL keep organization business data behind the authenticated API boundary, and server operations SHALL enforce organization membership because privileged Firebase Admin access is not constrained by Firestore client Security Rules.

#### Scenario: Browser attempts direct business-data access
- **WHEN** browser code attempts to read or write organization clients or work orders directly through a Firestore client SDK
- **THEN** Firestore Security Rules deny the operation

### Requirement: Existing data migration
The system SHALL provide an operator-controlled migration that copies existing global clients and work orders into a configured default organization while preserving document identifiers, timestamps, client relationships, and valid work-order counts. The migration SHALL support dry-run, SHALL be safe to repeat, and SHALL not remove global source records before verification succeeds.

#### Scenario: Preview migration
- **WHEN** an operator runs the migration in dry-run mode with a valid default organization
- **THEN** the system reports planned copies, conflicts, invalid references, and count discrepancies without writing data

#### Scenario: Migrate valid global records
- **WHEN** an operator runs the migration and every global work order references a global client that can be copied without conflict
- **THEN** the system copies clients and work orders to the default organization with stable identifiers and reports successful verification totals

#### Scenario: Repeat a completed migration
- **WHEN** an operator reruns the migration against target records whose data matches the global source
- **THEN** the system treats those records as already migrated and completes without creating duplicates or changing preserved timestamps

#### Scenario: Detect a migration conflict
- **WHEN** a target identifier already contains data that does not match the global source or a work order references a missing client
- **THEN** the system reports the conflict, does not overwrite conflicting data, and does not declare the migration verified

### Requirement: Migration cutover safety
The system SHALL require successful target verification before organization-scoped reads become the production source of truth, and SHALL retain a documented rollback path to the untouched global source during the cutover window.

#### Scenario: Verification fails before cutover
- **WHEN** migrated totals, relationships, or work-order counts fail verification
- **THEN** deployment remains on the global source and the operator receives actionable failure details

#### Scenario: Verification succeeds
- **WHEN** target document totals, relationships, and work-order counts match the expected global source state
- **THEN** the operator can enable organization-scoped repositories while retaining global records for the documented rollback window
