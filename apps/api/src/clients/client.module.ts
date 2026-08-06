import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { FirestoreClientRepository } from './firestore-client.repository';
import { CLIENT_REPOSITORY } from './client.constants';

@Module({
  controllers: [ClientController],
  providers: [
    ClientService,
    {
      provide: CLIENT_REPOSITORY,
      useClass: FirestoreClientRepository,
    },
  ],
  exports: [ClientService, CLIENT_REPOSITORY],
})
export class ClientModule {}
