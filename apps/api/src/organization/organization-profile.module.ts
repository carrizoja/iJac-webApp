import { Module } from '@nestjs/common';
import { FirestoreOrganizationProfileRepository } from './firestore-organization-profile.repository';
import { ORGANIZATION_PROFILE_REPOSITORY } from './organization-profile.constants';
import { OrganizationProfileController } from './organization-profile.controller';
import { OrganizationProfileService } from './organization-profile.service';

@Module({
  controllers: [OrganizationProfileController],
  providers: [
    OrganizationProfileService,
    {
      provide: ORGANIZATION_PROFILE_REPOSITORY,
      useClass: FirestoreOrganizationProfileRepository,
    },
  ],
  exports: [OrganizationProfileService],
})
export class OrganizationProfileModule {}
