## Purpose

Record payments received against a work order, keep an auditable, never-rewritten payment history with sequential receipt numbers, and expose the remaining balance of the job.

## ADDED Requirements

### Requirement: Payment record
The system SHALL persist each payment under its work order with an amount as a positive integer number of minor currency units, the work order's currency, a payment date, a method of `cash`, `bank-transfer`, `mercado-pago`, `check`, or `other`, optional notes, a receipt number, a status of `active` or `voided`, the identity of the admin who recorded it, and a server-managed creation timestamp.

#### Scenario: Record a valid payment
- **WHEN** an admin records a payment of 3000000 minor units by `bank-transfer` on a priced `ARS` work order with a remaining balance of 15000000
- **THEN** the system stores an `active` payment in `ARS` with the next receipt number and returns it

#### Scenario: Submit an invalid payment
- **WHEN** an admin submits a payment with a zero, negative, or non-integer amount, a missing date, or a method outside the allowed values
- **THEN** the system rejects the request with field-level validation details and stores no payment

### Requirement: Sequential receipt numbering
The system SHALL assign each new payment a receipt number that is unique within the organization and exactly one greater than the previously assigned number, starting at 1, even under concurrent requests. Receipt numbers SHALL be displayed as a 4-digit point-of-sale prefix `0001`, a hyphen, and the number zero-padded to 8 digits. Voiding SHALL never release or reuse a number.

#### Scenario: First payment of an organization
- **WHEN** an admin records the first payment in an organization
- **THEN** the payment receives number 1, displayed as `0001-00000001`

#### Scenario: Concurrent payments
- **WHEN** two admins record payments in the same organization at the same time
- **THEN** the payments receive two distinct, consecutive numbers

#### Scenario: Payment after a voided payment
- **WHEN** an admin records a payment after the payment numbered 42 was voided
- **THEN** the new payment receives number 43

### Requirement: Payment preconditions
The system SHALL reject a new payment when the work order has no total price, when the work order status is `cancelled`, or when the amount exceeds the remaining balance.

#### Scenario: Overpayment
- **WHEN** an admin records a payment larger than the work order's remaining balance
- **THEN** the system rejects the request with a validation error that states the remaining balance and stores no payment

#### Scenario: Unpriced work order
- **WHEN** an admin records a payment on a work order without a total price
- **THEN** the system rejects the request and stores no payment

#### Scenario: Cancelled work order
- **WHEN** an admin records a payment on a work order whose status is `cancelled`
- **THEN** the system rejects the request with a conflict error and stores no payment

#### Scenario: Pay the exact remaining balance
- **WHEN** an admin records a payment equal to the remaining balance
- **THEN** the system stores the payment and the remaining balance becomes zero

### Requirement: Idempotent payment recording
The system SHALL accept a client-generated idempotency key (a UUID) when recording a payment. A repeated request with the same key for the same work order SHALL return the originally recorded payment without creating a new payment or consuming a receipt number. Reusing a key for a different work order SHALL be rejected.

#### Scenario: Retry after a lost response
- **WHEN** an admin records a payment with idempotency key K, the response is lost, and the client retries with the same key K and payload
- **THEN** the system returns the payment recorded by the first request and the organization's next receipt number is unchanged

#### Scenario: Key reused for another work order
- **WHEN** a payment request uses an idempotency key already used for a payment of a different work order
- **THEN** the system rejects the request with a conflict error and stores no payment

### Requirement: Distinguishable payment errors
The system SHALL identify each payment business-rule rejection with a distinct, stable error code: work order not priced, work order cancelled, organization profile not configured, amount exceeds remaining balance, payment already voided, and idempotency key conflict. Clients SHALL NOT need to parse error message text to tell these cases apart.

#### Scenario: Cancelled work order code
- **WHEN** an admin records a payment on a cancelled work order
- **THEN** the error response carries the code for a cancelled work order

#### Scenario: Overpayment code
- **WHEN** an admin records a payment larger than the remaining balance
- **THEN** the error response carries the overpayment code and a field-level error for the amount

#### Scenario: Other invalid amount
- **WHEN** an admin submits a zero or non-integer amount
- **THEN** the error response is a generic validation error without the overpayment code, and the web shows an invalid-amount message rather than an overpayment message

### Requirement: Payment immutability and voiding
The system SHALL NOT allow a payment to be edited or deleted. An admin SHALL be able to void an `active` payment by providing a non-empty reason. The system SHALL then record the reason, the voiding admin, and the voiding time, and SHALL keep the voided payment visible with its original receipt number.

#### Scenario: Void a payment
- **WHEN** an admin voids an active payment with the reason "Monto cargado por error"
- **THEN** the payment status becomes `voided`, the reason, voiding admin, and voiding time are stored, and the payment still appears in the work order's payment list

#### Scenario: Void without a reason
- **WHEN** an admin voids a payment with an empty or whitespace-only reason
- **THEN** the system rejects the request and the payment stays `active`

#### Scenario: Void an already voided payment
- **WHEN** an admin voids a payment whose status is already `voided`
- **THEN** the system rejects the request with a conflict error and keeps the original voiding data

#### Scenario: Void on a cancelled work order
- **WHEN** an admin voids an active payment of a work order whose status is `cancelled`
- **THEN** the system voids the payment

### Requirement: Work-order balance
The system SHALL report, for each priced work order, the total price, the paid amount as the sum of its `active` payments, and the remaining balance as total price minus paid amount, all in the work order's currency.

#### Scenario: Balance with a voided payment
- **WHEN** a work order with total 10000000 has active payments of 3000000 and 2000000 and a voided payment of 1000000
- **THEN** the system reports paid 5000000 and remaining 5000000

#### Scenario: Balance with no payments
- **WHEN** a priced work order has no payments
- **THEN** the system reports paid 0 and remaining equal to the total price

### Requirement: Issuance-time snapshots
The system SHALL store with each payment a copy of the organization profile (business name, CUIT, address, phone) and of the client (name and tax identifier when present) and the work-order title as they are when the payment is recorded. Later changes to the organization, client, or work order SHALL NOT alter a stored payment. The system SHALL reject a new payment when the organization profile is not configured.

#### Scenario: Profile changes after issuance
- **WHEN** an admin changes the organization address after payment 42 was recorded
- **THEN** payment 42 still carries the address that was current when it was recorded

#### Scenario: Profile not configured
- **WHEN** an admin records a payment in an organization whose profile has never been saved
- **THEN** the system rejects the request with an error stating the organization profile must be completed first

### Requirement: Payment access control
The system SHALL allow only members with the `admin` role to record or void payments, and SHALL allow every active member of the organization to list a work order's payments and read its balance. Payments SHALL be isolated per organization like other business data.

#### Scenario: Member records a payment
- **WHEN** an active member with the `member` role attempts to record or void a payment
- **THEN** the system rejects the request as forbidden and stores no change

#### Scenario: Member views payments
- **WHEN** an active member with the `member` role lists the payments of a work order in their organization
- **THEN** the system returns the payments and balance

#### Scenario: Foreign organization payment
- **WHEN** a user requests or voids a payment that belongs to a work order of another organization
- **THEN** the system responds as if the payment does not exist

### Requirement: Payments panel
The web application SHALL show, in the work-order details, the total, paid amount, and remaining balance, plus the payment list with receipt number, date, method, amount, and status. Admins SHALL see actions to record and void payments. Members SHALL NOT see these actions.

#### Scenario: Admin records a payment from details
- **WHEN** an admin opens a priced work order, records a payment, and submits
- **THEN** the payment appears in the list and the paid and remaining amounts update

#### Scenario: Member opens details
- **WHEN** a member opens a priced work order with payments
- **THEN** the panel shows the balance and payments without record or void actions

#### Scenario: Unpriced work order details
- **WHEN** a user opens a work order without a total price
- **THEN** the panel indicates that a total price is required before recording payments
