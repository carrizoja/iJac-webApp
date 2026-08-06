## ADDED Requirements

### Requirement: Google sign-in
The web application SHALL authenticate users through Firebase Authentication with the Google provider and SHALL request the Google Calendar authorization scope during sign-in.

#### Scenario: Complete sign-in
- **WHEN** a user grants the requested Google permissions
- **THEN** the web application establishes a Firebase-authenticated session and sends the user to the internal application

#### Scenario: Cancel sign-in
- **WHEN** a user cancels or Google rejects the authorization request
- **THEN** the web application remains signed out and displays an actionable authentication error without exposing provider details or credentials

### Requirement: Protected application access
The web application SHALL restrict internal routes and actions to an authenticated Firebase user.

#### Scenario: Open a protected route while signed out
- **WHEN** an unauthenticated visitor requests an internal application route
- **THEN** the web application redirects the visitor to sign in

#### Scenario: Sign out
- **WHEN** an authenticated user signs out
- **THEN** the Firebase session is cleared and protected application content is no longer accessible

### Requirement: Server-side API authorization
The NestJS API SHALL require a valid Firebase ID token for every business endpoint and SHALL derive the caller identity from the verified token rather than client-supplied identity fields.

#### Scenario: Call API with a valid token
- **WHEN** a request carries a current Firebase ID token in the authorization header
- **THEN** the API verifies the token with Firebase Admin and allows the authorized request to continue

#### Scenario: Call API without a valid token
- **WHEN** a request omits its token or carries an invalid, expired, or revoked token
- **THEN** the API returns an unauthorized response without executing the business operation

### Requirement: Long-lived Calendar authorization
The system SHALL complete a server-side Google OAuth authorization-code exchange with offline access and SHALL store the resulting refresh credential in server-only storage associated with the authenticated Firebase user.

#### Scenario: Capture a refresh credential
- **WHEN** an authenticated user completes Google consent and the API receives a valid one-time authorization code
- **THEN** the API exchanges the code using its configured OAuth client and securely stores the returned refresh credential

#### Scenario: Consent yields no refresh credential
- **WHEN** Google returns access credentials without a refresh credential and no usable credential is already stored
- **THEN** the system explains that Calendar authorization must be granted again and does not report synchronization as enabled

### Requirement: Credential confidentiality
The system SHALL prevent Google OAuth refresh credentials from being readable by the browser, Firestore client SDK, application logs, or unauthenticated API callers.

#### Scenario: Read application data from the browser
- **WHEN** an authenticated browser reads its permitted application data
- **THEN** no Google access token, refresh credential, OAuth client secret, or credential-encryption key is included
