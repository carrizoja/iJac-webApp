import { Controller, Get, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarSyncService } from './calendar-sync.service';
import { UserRequest } from '../auth/user-request';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsISO8601 } from 'class-validator';

class CalendarRangeQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly service: CalendarService,
    private readonly syncService: CalendarSyncService,
  ) {}

  @Get('events')
  async events(@CurrentUser() user: UserRequest, @Query() query: CalendarRangeQueryDto) {
    return this.service.findEventsInRange(user.uid, query.from, query.to);
  }

  @Post('sync')
  async sync(@CurrentUser() user: UserRequest, @Query() query: CalendarRangeQueryDto) {
    const events = await this.service.findEventsInRange(user.uid, query.from, query.to);
    const results = await Promise.all(
      events.map((event) =>
        this.syncService.syncWorkOrder(user.uid, {
          id: event.workOrderId,
          title: event.title,
          status: event.status,
          dueDate: event.dueDate,
        }),
      ),
    );
    return {
      attempted: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  }

  @Get('sync/status')
  async syncStatus(@CurrentUser() user: UserRequest) {
    return this.syncService.getSyncStatus(user.uid);
  }
}
