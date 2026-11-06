## Purpose

Define the organization's issuer data (business name, CUIT, address, phone) that appears on receipts, and who may view and edit it.

## ADDED Requirements

### Requirement: Organization profile record
The system SHALL maintain, for each organization, a profile with a business name, a CUIT, an address, and a phone, plus a server-managed update timestamp. The CUIT SHALL be stored as 11 digits and SHALL pass the CUIT check-digit validation.

#### Scenario: Save a valid profile
- **WHEN** an organization admin submits a business name, a CUIT with a valid check digit (with or without hyphens), an address, and a phone
- **THEN** the system stores the profile with the CUIT normalized to 11 digits and a new `updatedAt`

#### Scenario: Submit an invalid CUIT
- **WHEN** an organization admin submits a CUIT that does not have 11 digits or whose check digit is invalid
- **THEN** the system rejects the request with a field-level validation error for the CUIT and stores no change

#### Scenario: Submit a missing required field
- **WHEN** an organization admin submits a profile without a business name, CUIT, address, or phone
- **THEN** the system rejects the request with field-level validation details and stores no change

### Requirement: Organization profile access
The system SHALL allow every active member of an organization to read that organization's profile, and SHALL allow only members with the `admin` role to modify it.

#### Scenario: Member reads the profile
- **WHEN** an active member with the `member` role requests the organization profile
- **THEN** the system returns the profile

#### Scenario: Member attempts to edit the profile
- **WHEN** an active member with the `member` role submits profile changes
- **THEN** the system rejects the request as forbidden and stores no change

#### Scenario: Profile not yet configured
- **WHEN** a member requests the profile of an organization whose profile has never been saved
- **THEN** the system responds that the profile is not configured, without failing

### Requirement: Organization profile settings screen
The web application SHALL provide a Settings screen where admins edit the organization profile and members view it read-only.

#### Scenario: Admin edits the profile
- **WHEN** an admin opens Settings, changes the address, and saves
- **THEN** the screen confirms the save and shows the updated address

#### Scenario: Member opens settings
- **WHEN** a member opens Settings
- **THEN** the screen shows the profile without editable inputs or a save action
