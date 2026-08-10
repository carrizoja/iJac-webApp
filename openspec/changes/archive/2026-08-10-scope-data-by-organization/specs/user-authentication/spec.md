## MODIFIED Requirements

### Requirement: Server-side API authorization
The NestJS API SHALL require a valid Firebase ID token for every business endpoint, SHALL derive the caller identity from the verified token rather than client-supplied identity fields, and SHALL resolve an active server-controlled organization membership before accessing organization business data.

#### Scenario: Call API with a valid token and membership
- **WHEN** a request carries a current Firebase ID token whose caller has an active membership in the resolved organization
- **THEN** the API verifies the token and membership and allows the authorized organization-scoped request to continue

#### Scenario: Call API without a valid token
- **WHEN** a request omits its token or carries an invalid, expired, or revoked token
- **THEN** the API returns an unauthorized response without executing the business operation

#### Scenario: Call API without an active organization membership
- **WHEN** a request carries a valid Firebase ID token but the caller has no active membership for the resolved organization
- **THEN** the API returns a forbidden response without reading or writing organization business data
