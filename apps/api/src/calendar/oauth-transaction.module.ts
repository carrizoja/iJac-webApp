import { Module } from '@nestjs/common';
import { FirestoreOAuthTransactionRepository } from './firestore-oauth-transaction.repository';
import { OAUTH_TRANSACTION_REPOSITORY } from './oauth-transaction.constants';

@Module({
  providers: [
    {
      provide: OAUTH_TRANSACTION_REPOSITORY,
      useClass: FirestoreOAuthTransactionRepository,
    },
  ],
  exports: [OAUTH_TRANSACTION_REPOSITORY],
})
export class OAuthTransactionModule {}
