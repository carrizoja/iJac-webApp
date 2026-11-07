import { Module, Global } from '@nestjs/common';
import { FirestoreOrganizationMembershipRepository } from './firestore-organization-membership.repository';
import { MeController } from './me.controller';

export const ORGANIZATION_MEMBERSHIP_REPOSITORY = Symbol(
  'ORGANIZATION_MEMBERSHIP_REPOSITORY',
);

@Global()
@Module({
  controllers: [MeController],
  providers: [
    {
      provide: ORGANIZATION_MEMBERSHIP_REPOSITORY,
      useClass: FirestoreOrganizationMembershipRepository,
    },
  ],
  exports: [ORGANIZATION_MEMBERSHIP_REPOSITORY],
})
export class AuthModule {}
