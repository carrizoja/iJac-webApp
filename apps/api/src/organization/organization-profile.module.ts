import { Module } from '@nestjs/common';
import { FirestoreOrganizationProfileRepository } from './firestore-organization-profile.repository';
import {
  ORGANIZATION_BRANDING_REPOSITORY,
  ORGANIZATION_PROFILE_REPOSITORY,
} from './organization-profile.constants';
import { FirestoreOrganizationBrandingRepository } from './firestore-organization-branding.repository';
import { OrganizationBrandingController } from './organization-branding.controller';
import { OrganizationBrandingService } from './organization-branding.service';
import { OrganizationProfileController } from './organization-profile.controller';
import { OrganizationProfileService } from './organization-profile.service';

@Module({
  controllers: [OrganizationProfileController, OrganizationBrandingController],
  providers: [
    OrganizationProfileService,
    OrganizationBrandingService,
    {
      provide: ORGANIZATION_BRANDING_REPOSITORY,
      useClass: FirestoreOrganizationBrandingRepository,
    },
    {
      provide: ORGANIZATION_PROFILE_REPOSITORY,
      useClass: FirestoreOrganizationProfileRepository,
    },
  ],
  exports: [OrganizationProfileService],
})
export class OrganizationProfileModule {}
