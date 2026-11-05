import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { BrandingImage, BrandingKind } from '@ijac/shared';
import { FIRESTORE } from '../firebase/firebase.module';
import { ApiEnvironment } from '../config/env';
import { nowTimestamp, toIsoString } from '../common/timestamps';
import {
  OrganizationBrandingRepository,
  SaveBrandingImageInput,
} from './organization-branding.repository';

type StoredImage = Omit<BrandingImage, 'updatedAt'> & { updatedAt: Timestamp };

/**
 * One document per image, kept apart from the organization document so that
 * reading the organization never loads the image bytes. Server-only: the
 * Firestore rules deny clients access to it.
 */
@Injectable()
export class FirestoreOrganizationBrandingRepository implements OrganizationBrandingRepository {
  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  private document(organizationId: string, kind: BrandingKind) {
    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return this.firestore.collection('settings').doc(`branding-${kind}`);
    }
    return this.firestore
      .collection('organizations')
      .doc(organizationId)
      .collection('branding')
      .doc(kind);
  }

  private toImage(stored: StoredImage): BrandingImage {
    return {
      contentType: stored.contentType,
      data: stored.data,
      updatedAt: toIsoString(stored.updatedAt) ?? '',
    };
  }

  async find(organizationId: string, kind: BrandingKind): Promise<BrandingImage | null> {
    const doc = await this.document(organizationId, kind).get();
    return doc.exists ? this.toImage(doc.data() as StoredImage) : null;
  }

  async save(
    organizationId: string,
    kind: BrandingKind,
    input: SaveBrandingImageInput,
  ): Promise<BrandingImage> {
    const stored: StoredImage = {
      contentType: input.contentType,
      data: input.data,
      updatedAt: nowTimestamp(),
    };
    await this.document(organizationId, kind).set(stored);
    return this.toImage(stored);
  }

  async remove(organizationId: string, kind: BrandingKind): Promise<void> {
    await this.document(organizationId, kind).delete();
  }
}
