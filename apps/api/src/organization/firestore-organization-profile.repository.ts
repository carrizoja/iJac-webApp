import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { OrganizationProfile } from '@ijac/shared';
import { FIRESTORE } from '../firebase/firebase.module';
import { ApiEnvironment } from '../config/env';
import { nowTimestamp, toIsoString } from '../common/timestamps';
import {
  OrganizationProfileRepository,
  SaveOrganizationProfileInput,
} from './organization-profile.repository';

type StoredProfile = Omit<OrganizationProfile, 'updatedAt'> & {
  updatedAt: Timestamp;
};

@Injectable()
export class FirestoreOrganizationProfileRepository implements OrganizationProfileRepository {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  /** The profile lives under `profile` on the organization (or settings) document. */
  private document(organizationId: string) {
    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return this.firestore.collection('settings').doc('organization');
    }

    return this.firestore.collection('organizations').doc(organizationId);
  }

  private toProfile(stored: StoredProfile): OrganizationProfile {
    return {
      businessName: stored.businessName,
      cuit: stored.cuit,
      address: stored.address,
      phone: stored.phone,
      updatedAt: toIsoString(stored.updatedAt) ?? '',
    };
  }

  async find(organizationId: string): Promise<OrganizationProfile | null> {
    const doc = await this.document(organizationId).get();
    const stored = doc.exists ? (doc.get('profile') as StoredProfile | undefined) : undefined;
    return stored ? this.toProfile(stored) : null;
  }

  async save(
    organizationId: string,
    input: SaveOrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    const stored: StoredProfile = {
      businessName: input.businessName,
      cuit: input.cuit,
      address: input.address,
      phone: input.phone,
      updatedAt: nowTimestamp(),
    };
    await this.document(organizationId).set({ profile: stored }, { merge: true });
    return this.toProfile(stored);
  }
}
