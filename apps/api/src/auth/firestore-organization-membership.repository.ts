import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { OrganizationMembership } from '@ijac/shared';
import { FIRESTORE } from '../firebase/firebase.module';
import { OrganizationMembershipRepository } from './organization-membership.repository';
import { toIsoString } from '../common/timestamps';

@Injectable()
export class FirestoreOrganizationMembershipRepository
  implements OrganizationMembershipRepository
{
  constructor(@Inject(FIRESTORE) private readonly firestore: Firestore) {}

  private activeMembershipsCollection() {
    return this.firestore.collection('activeOrganizationMemberships');
  }

  private membershipsCollection(organizationId: string) {
    return this.firestore
      .collection('organizations')
      .doc(organizationId)
      .collection('members');
  }

  async findActiveByUid(uid: string): Promise<OrganizationMembership | null> {
    const locatorDoc = await this.activeMembershipsCollection().doc(uid).get();
    if (!locatorDoc.exists) {
      return null;
    }

    const locator = locatorDoc.data() as {
      organizationId: string;
      status: string;
    };

    if (locator.status !== 'active') {
      return null;
    }

    const membershipDoc = await this.membershipsCollection(locator.organizationId)
      .doc(uid)
      .get();
    if (!membershipDoc.exists) {
      return null;
    }

    return this.toMembership(membershipDoc);
  }

  async findByUidAndOrganizationId(
    uid: string,
    organizationId: string,
  ): Promise<OrganizationMembership | null> {
    const membershipDoc = await this.membershipsCollection(organizationId)
      .doc(uid)
      .get();
    if (!membershipDoc.exists) {
      return null;
    }

    return this.toMembership(membershipDoc);
  }

  private toMembership(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): OrganizationMembership {
    const data = doc.data() as Omit<
      OrganizationMembership,
      'uid' | 'createdAt' | 'updatedAt'
    > & {
      createdAt: FirebaseFirestore.Timestamp;
      updatedAt: FirebaseFirestore.Timestamp;
    };

    return {
      ...data,
      uid: doc.id,
      createdAt: toIsoString(data.createdAt) ?? '',
      updatedAt: toIsoString(data.updatedAt) ?? '',
    };
  }
}
