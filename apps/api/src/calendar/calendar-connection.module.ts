import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { CalendarConnectionService } from './calendar-connection.service';
import { CalendarConnectionController } from './calendar-connection.controller';
import { CalendarSyncService } from './calendar-sync.service';
import { FirestoreCalendarConnectionRepository } from './firestore-connection.repository';
import { FirestoreCalendarEventMappingRepository } from './firestore-event-mapping.repository';
import { OAuthTransactionModule } from './oauth-transaction.module';
import { ApiEnvironment } from '../config/env';
import {
  CALENDAR_CONNECTION_REPOSITORY,
  CALENDAR_EVENT_MAPPING_REPOSITORY,
  GOOGLE_OAUTH_CLIENT,
} from './calendar-connection.constants';

export function createGoogleOAuthClient(config: ConfigService<ApiEnvironment>): OAuth2Client {
  return new OAuth2Client(
    config.getOrThrow('GOOGLE_CLIENT_ID'),
    config.getOrThrow('GOOGLE_CLIENT_SECRET'),
  );
}

@Module({
  imports: [OAuthTransactionModule],
  controllers: [CalendarConnectionController],
  providers: [
    CalendarConnectionService,
    CalendarSyncService,
    {
      provide: CALENDAR_CONNECTION_REPOSITORY,
      useClass: FirestoreCalendarConnectionRepository,
    },
    {
      provide: CALENDAR_EVENT_MAPPING_REPOSITORY,
      useClass: FirestoreCalendarEventMappingRepository,
    },
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useFactory: createGoogleOAuthClient,
      inject: [ConfigService],
    },
  ],
  exports: [
    CalendarConnectionService,
    CalendarSyncService,
    CALENDAR_CONNECTION_REPOSITORY,
    CALENDAR_EVENT_MAPPING_REPOSITORY,
  ],
})
export class CalendarConnectionModule {}
