import { Injectable, Inject } from '@nestjs/common';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FIRESTORE } from '../firebase/firebase.module';

export interface ProvisionInput {
  organizationId: string;
  name: string;
  members: Array<{
    uid: string;
    email: string;
    role: 'admin' | 'member';
  }>;
}

export interface ProvisionOptions {
  /** Report what would be written without writing anything. */
  dryRun?: boolean;
}

export interface ProvisionResult {
  organizationCreated: boolean;
  membersCreated: number;
  membersUpdated: number;
}

/**
 * Creates an organization and its active memberships. Safe to re-run: an
 * existing organization document (and its profile) is never overwritten, and
 * an existing membership keeps its creation time.
 */
@Injectable()
export class OrganizationProvisioningService {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  async provision(input: ProvisionInput, options: ProvisionOptions = {}): Promise<ProvisionResult> {
    const orgRef = this.firestore.collection('organizations').doc(input.organizationId);

    return this.firestore.runTransaction(async (tx) => {
      const orgSnapshot = await tx.get(orgRef);
      const members = await Promise.all(
        input.members.map(async (member) => {
          const membershipRef = orgRef.collection('members').doc(member.uid);
          return { member, membershipRef, snapshot: await tx.get(membershipRef) };
        }),
      );

      const result: ProvisionResult = {
        organizationCreated: !orgSnapshot.exists,
        membersCreated: members.filter((m) => !m.snapshot.exists).length,
        membersUpdated: members.filter((m) => m.snapshot.exists).length,
      };
      if (options.dryRun) {
        return result;
      }

      const now = Timestamp.now();
      if (!orgSnapshot.exists) {
        tx.set(orgRef, { name: input.name, createdAt: now, updatedAt: now });
      }

      for (const { member, membershipRef, snapshot } of members) {
        const existingCreatedAt = snapshot.exists ? snapshot.data()?.createdAt : undefined;
        tx.set(membershipRef, {
          uid: member.uid,
          email: member.email,
          organizationId: input.organizationId,
          role: member.role,
          status: 'active',
          createdAt: existingCreatedAt ?? now,
          updatedAt: now,
        });
        tx.set(this.firestore.collection('activeOrganizationMemberships').doc(member.uid), {
          uid: member.uid,
          organizationId: input.organizationId,
          status: 'active',
          updatedAt: now,
        });
      }

      return result;
    });
  }
}
