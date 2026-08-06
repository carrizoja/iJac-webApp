import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { WorkOrderModule } from '../work-orders/work-order.module';
import { CalendarConnectionModule } from './calendar-connection.module';

@Module({
  imports: [WorkOrderModule, CalendarConnectionModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
