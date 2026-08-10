import { Module, Global } from '@nestjs/common';
import { FirestoreOrganizationMembershipRepository } from './firestore-organization-membership.repository';

export const ORGANIZATION_MEMBERSHIP_REPOSITORY = Symbol(
  'ORGANIZATION_MEMBERSHIP_REPOSITORY',
);

@Global()
@Module({
  providers: [
    {
      provide: ORGANIZATION_MEMBERSHIP_REPOSITORY,
      useClass: FirestoreOrganizationMembershipRepository,
    },
  ],
  exports: [ORGANIZATION_MEMBERSHIP_REPOSITORY],
})
export class AuthModule {}
