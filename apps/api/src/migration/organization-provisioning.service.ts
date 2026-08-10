import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
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

@Injectable()
export class OrganizationProvisioningService {
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  async provision(input: ProvisionInput): Promise<void> {
    const orgRef = this.firestore.collection('organizations').doc(input.organizationId);

    // Create organization document
    await orgRef.set({
      name: input.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create membership documents and locators
    const batch = this.firestore.batch();

    for (const member of input.members) {
      const membershipRef = orgRef.collection('members').doc(member.uid);
      const locatorRef = this.firestore
        .collection('activeOrganizationMemberships')
        .doc(member.uid);

      const now = new Date().toISOString();

      batch.set(membershipRef, {
        uid: member.uid,
        email: member.email,
        organizationId: input.organizationId,
        role: member.role,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      batch.set(locatorRef, {
        uid: member.uid,
        organizationId: input.organizationId,
        status: 'active',
        updatedAt: now,
      });
    }

    await batch.commit();
  }
}
