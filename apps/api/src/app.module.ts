import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ClientModule } from './clients/client.module';
import { WorkOrderModule } from './work-orders/work-order.module';
import { CalendarModule } from './calendar/calendar.module';
import { CalendarConnectionModule } from './calendar/calendar-connection.module';
import { validateApiEnvironment } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development.local'],
      validate: (config: Record<string, unknown>) => validateApiEnvironment(config),
    }),
    FirebaseModule,
    HealthModule,
    ClientModule,
    WorkOrderModule,
    CalendarModule,
    CalendarConnectionModule,
  ],
})
export class AppModule {}
