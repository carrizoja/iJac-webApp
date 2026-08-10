## ADDED Requirements

### Requirement: Editorial client-management page composition
The Clients page SHALL present the existing client-management workflow inside an iJac editorial composition with breadcrumb context, a concise accent pill, a prominent page heading, supporting explanation, a large rounded bordered surface, and reference-aligned primary and secondary actions.

#### Scenario: Open the Clients page
- **WHEN** an authenticated user opens the Clients page
- **THEN** the page presents the current location, an iJac-branded introduction, the client search/create controls, and client content in a visually coherent dark editorial surface

#### Scenario: Use the page actions
- **WHEN** the user focuses or activates create, edit, cancel, save, search, or delete actions
- **THEN** each action uses the shared iJac button hierarchy with visible focus, clear enabled/disabled/pending states, and primary versus secondary contrast consistent with the reference style

#### Scenario: View client content on mobile
- **WHEN** an authenticated user opens the Clients page on a supported mobile viewport
- **THEN** the breadcrumb, introduction, controls, forms, cards, empty state, and deletion confirmation reflow in reading order without horizontal overflow and retain touch targets of at least 44 by 44 CSS pixels

#### Scenario: Preserve client workflow outcomes
- **WHEN** the user searches, creates, edits, cancels, or confirms deletion of a client through the redesigned page
- **THEN** the application preserves the existing validation, resource calls, authorization behavior, success feedback, and dependency-conflict errors

#### Scenario: Render client loading, empty, and error states
- **WHEN** client data is loading, no records match, or a request fails
- **THEN** the page renders a perceivable state using the same editorial surface, semantic iJac treatments, accessible status cues, and actionable recovery behavior without shifting unrelated content unexpectedly
