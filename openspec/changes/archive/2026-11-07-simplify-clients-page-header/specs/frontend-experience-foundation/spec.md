## MODIFIED Requirements

### Requirement: Editorial client-management page composition
The Clients page SHALL present the existing client-management workflow with breadcrumb context, the same plain page heading and one-line description used by the other internal pages, a large rounded bordered surface, and reference-aligned primary and secondary actions. The page SHALL leave the single main landmark to the application shell.

#### Scenario: Open the Clients page
- **WHEN** an authenticated user opens the Clients page
- **THEN** the page presents the current location, a plain "Clientes" heading with a one-line description, the client search/create controls, and client content in a visually coherent dark surface, with exactly one main landmark

#### Scenario: Use the page actions
- **WHEN** the user focuses or activates create, edit, cancel, save, search, or delete actions
- **THEN** each action uses the shared iJac button hierarchy with visible focus, clear enabled/disabled/pending states, and primary versus secondary contrast consistent with the reference style

#### Scenario: View client content on mobile
- **WHEN** an authenticated user opens the Clients page on a supported mobile viewport
- **THEN** the breadcrumb, heading, controls, forms, cards, empty state, and deletion confirmation reflow in reading order without horizontal overflow and retain touch targets of at least 44 by 44 CSS pixels

#### Scenario: Preserve client workflow outcomes
- **WHEN** the user searches, creates, edits, cancels, or confirms deletion of a client through the redesigned page
- **THEN** the application preserves the existing validation, resource calls, authorization behavior, success feedback, and dependency-conflict errors

#### Scenario: Render client loading, empty, and error states
- **WHEN** client data is loading, no records match, or a request fails
- **THEN** the page renders a perceivable state using the same surface, semantic iJac treatments, accessible status cues, and actionable recovery behavior without shifting unrelated content unexpectedly
