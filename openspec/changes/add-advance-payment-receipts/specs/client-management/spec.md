## MODIFIED Requirements

### Requirement: Client record model
The system SHALL persist each client with a name, email, phone, optional company or organization, optional notes, optional tax identifier (CUIT or DNI), and server-managed creation and update timestamps.

#### Scenario: Create a valid client
- **WHEN** an authenticated user submits a client with all required fields and valid contact values
- **THEN** the system stores the client with a generated identifier and server-generated `createdAt` and `updatedAt` values

#### Scenario: Submit invalid client data
- **WHEN** an authenticated user submits a missing name or malformed contact value
- **THEN** the system rejects the request with field-level validation details and stores no client

#### Scenario: Create a client with a tax identifier
- **WHEN** an authenticated user submits a client with a tax identifier made of 7 to 11 digits, optionally separated by hyphens or dots
- **THEN** the system stores the tax identifier normalized to digits only

#### Scenario: Submit an invalid tax identifier
- **WHEN** an authenticated user submits a tax identifier that contains letters, has fewer than 7 or more than 11 digits, or has 11 digits with an invalid CUIT check digit
- **THEN** the system rejects the request with a field-level validation error for the tax identifier and stores no change

#### Scenario: Clear a tax identifier
- **WHEN** an authenticated user updates a client with an empty tax identifier
- **THEN** the system stores the client without a tax identifier
