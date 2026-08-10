# Organization Data Isolation - Operations Guide

## Overview

This guide covers the operational steps to migrate from global Firestore collections to organization-scoped subcollections.

## Prerequisites

- Firebase CLI authenticated and configured
- Valid `DEFAULT_ORGANIZATION_ID` environment variable or `--organization-id` flag
- All existing users have Firebase Authentication accounts

## Step 1: Provision Default Organization

Create the default organization and assign memberships:

```bash
# Using the provisioning service programmatically
# or manually create documents in Firestore:
# - organizations/{orgId} - organization metadata
# - organizations/{orgId}/members/{uid} - membership records
# - activeOrganizationMemberships/{uid} - locator documents
```

## Step 2: Run Migration Dry-Run

Preview the migration without making changes:

```bash
cd apps/api
npx ts-node src/migration/migrate.ts --dry-run --organization-id=your-org-id
```

Review the output for:
- Number of clients/work orders to copy
- Any orphaned work orders (missing client references)
- Any conflicts with existing target data

## Step 3: Resolve Conflicts

If the dry-run reports conflicts:
1. Investigate documents that exist in both global and target collections with different data
2. Either reconcile the differences or remove the conflicting target data
3. Re-run dry-run until it reports no conflicts

## Step 4: Enable Maintenance Mode

Before running the actual migration, prevent write operations:
- Temporarily disable API write endpoints, or
- Set `REPOSITORY_MODE=global` and restart the API

## Step 5: Run Migration

Execute the actual migration:

```bash
cd apps/api
npx ts-node src/migration/migrate.ts --organization-id=your-org-id
```

This will:
- Copy all global clients to `organizations/{orgId}/clients`
- Copy all global work orders to `organizations/{orgId}/workOrders`
- Copy calendar event mappings to `organizations/{orgId}/calendarEventMappings`
- Preserve document IDs and timestamps

## Step 6: Verify Migration

After migration completes successfully:
1. Count source and target documents match
2. Verify work order to client relationships
3. Verify client work order counters

## Step 7: Deploy Organization Mode

1. Set `REPOSITORY_MODE=organization` in environment
2. Deploy updated Firestore rules:
   ```bash
   pnpm dlx firebase-tools deploy --only firestore:rules
   ```
3. Deploy updated indexes:
   ```bash
   pnpm dlx firebase-tools deploy --only firestore:indexes
   ```
4. Restart the API

## Step 8: Smoke Test

Test the following scenarios:
- [ ] Authenticated user with active membership can read/write clients
- [ ] Authenticated user with active membership can read/write work orders
- [ ] Work order client references resolve correctly
- [ ] Client deletion blocked when work orders exist
- [ ] Cross-organization access returns 403 or 404
- [ ] Calendar events load correctly

## Rollback

**Before writes resume:**
1. Set `REPOSITORY_MODE=global`
2. Restart the API
3. Global data remains intact

**After writes resume:**
- Rollback to global mode is **prohibited** without a reverse migration
- Organization-scoped writes would be lost

## Legacy Data Retention

Global collections remain untouched after migration. They can be:
- Retained as backup during observation period
- Removed after confirming organization mode stability
- Archived to a separate backup collection before removal
