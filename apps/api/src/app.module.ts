import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './clients/client.module';
import { WorkOrderModule } from './work-orders/work-order.module';
import { CalendarModule } from './calendar/calendar.module';
import { CalendarConnectionModule } from './calendar/calendar-connection.module';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { OrganizationAuthGuard } from './auth/organization-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { OrganizationProfileModule } from './organization/organization-profile.module';
import { MigrationModule } from './migration/migration.module';
import { validateApiEnvironment } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development.local'],
      validate: (config: Record<string, unknown>) => validateApiEnvironment(config),
    }),
    FirebaseModule,
    AuthModule,
    HealthModule,
    ClientModule,
    WorkOrderModule,
    CalendarModule,
    CalendarConnectionModule,
    OrganizationProfileModule,
    MigrationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
