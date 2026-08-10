import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore } from 'firebase-admin/firestore';
import { ApiEnvironment } from '../config/env';
import { FIRESTORE } from '../firebase/firebase.module';

export interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  clientsCopied: number;
  clientsSkipped: number;
  clientsConflicts: number;
  workOrdersCopied: number;
  workOrdersSkipped: number;
  workOrdersConflicts: number;
  workOrdersOrphaned: number;
  mappingsCopied: number;
  mappingsSkipped: number;
  errors: string[];
}

@Injectable()
export class OrganizationMigrationService {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  async migrate(dryRun: boolean, defaultOrganizationId?: string): Promise<MigrationResult> {
    const targetOrg = defaultOrganizationId || this.config.get('DEFAULT_ORGANIZATION_ID');
    if (!targetOrg) {
      throw new Error('DEFAULT_ORGANIZATION_ID must be provided or configured');
    }

    const result: MigrationResult = {
      success: true,
      dryRun,
      clientsCopied: 0,
      clientsSkipped: 0,
      clientsConflicts: 0,
      workOrdersCopied: 0,
      workOrdersSkipped: 0,
      workOrdersConflicts: 0,
      workOrdersOrphaned: 0,
      mappingsCopied: 0,
      mappingsSkipped: 0,
      errors: [],
    };

    // Read global clients
    const globalClientsSnapshot = await this.firestore.collection('clients').get();
    const globalClients = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const doc of globalClientsSnapshot.docs) {
      globalClients.set(doc.id, doc);
    }

    // Read global work orders
    const globalWorkOrdersSnapshot = await this.firestore.collection('workOrders').get();
    const globalWorkOrders = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    for (const doc of globalWorkOrdersSnapshot.docs) {
      globalWorkOrders.set(doc.id, doc);
    }

    // Check for orphaned work orders
    for (const [id, doc] of globalWorkOrders) {
      const clientId = doc.get('clientId') as string;
      if (!globalClients.has(clientId)) {
        result.workOrdersOrphaned++;
        result.errors.push(`Orphaned work order ${id} references missing client ${clientId}`);
      }
    }

    if (result.workOrdersOrphaned > 0) {
      result.success = false;
      return result;
    }

    // Copy clients
    const targetClientsCollection = this.firestore
      .collection('organizations')
      .doc(targetOrg)
      .collection('clients');

    for (const [id, doc] of globalClients) {
      const targetDoc = await targetClientsCollection.doc(id).get();
      if (targetDoc.exists) {
        const targetData = targetDoc.data();
        const sourceData = doc.data();
        const isMatch = this.documentsMatch(targetData, sourceData);
        if (isMatch) {
          result.clientsSkipped++;
        } else {
          result.clientsConflicts++;
          result.errors.push(`Client ${id} exists in target with different data`);
        }
      } else if (!dryRun) {
        await targetClientsCollection.doc(id).set(doc.data()!);
        result.clientsCopied++;
      } else {
        result.clientsCopied++; // Count as would-be copied in dry-run
      }
    }

    if (result.clientsConflicts > 0) {
      result.success = false;
      return result;
    }

    // Copy work orders
    const targetWorkOrdersCollection = this.firestore
      .collection('organizations')
      .doc(targetOrg)
      .collection('workOrders');

    for (const [id, doc] of globalWorkOrders) {
      const targetDoc = await targetWorkOrdersCollection.doc(id).get();
      if (targetDoc.exists) {
        const targetData = targetDoc.data();
        const sourceData = doc.data();
        const isMatch = this.documentsMatch(targetData, sourceData);
        if (isMatch) {
          result.workOrdersSkipped++;
        } else {
          result.workOrdersConflicts++;
          result.errors.push(`Work order ${id} exists in target with different data`);
        }
      } else if (!dryRun) {
        await targetWorkOrdersCollection.doc(id).set(doc.data()!);
        result.workOrdersCopied++;
      } else {
        result.workOrdersCopied++;
      }
    }

    if (result.workOrdersConflicts > 0) {
      result.success = false;
      return result;
    }

    // Copy calendar event mappings
    const globalMappingsSnapshot = await this.firestore.collection('calendarEventMappings').get();
    const targetMappingsCollection = this.firestore
      .collection('organizations')
      .doc(targetOrg)
      .collection('calendarEventMappings');

    for (const doc of globalMappingsSnapshot.docs) {
      const workOrderId = doc.get('workOrderId') as string;
      const targetDoc = await targetMappingsCollection.doc(workOrderId).get();
      if (targetDoc.exists) {
        result.mappingsSkipped++;
      } else if (!dryRun) {
        await targetMappingsCollection.doc(workOrderId).set(doc.data()!);
        result.mappingsCopied++;
      } else {
        result.mappingsCopied++;
      }
    }

    return result;
  }

  private documentsMatch(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (a === null || b === null) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (aObj[key] !== bObj[key]) return false;
    }

    return true;
  }
}
