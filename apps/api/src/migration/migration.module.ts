import { Module } from '@nestjs/common';
import { OrganizationMigrationService } from './organization-migration.service';
import { OrganizationProvisioningService } from './organization-provisioning.service';

@Module({
  providers: [OrganizationMigrationService, OrganizationProvisioningService],
  exports: [OrganizationMigrationService, OrganizationProvisioningService],
})
export class MigrationModule {}
