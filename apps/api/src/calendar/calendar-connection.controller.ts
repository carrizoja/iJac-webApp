import { Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CalendarConnectionService } from './calendar-connection.service';
import { UserRequest } from '../auth/user-request';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { ApiEnvironment } from '../config/env';

@Controller('calendar/connection')
export class CalendarConnectionController {
  private readonly logger = new Logger(CalendarConnectionController.name);

  constructor(
    private readonly service: CalendarConnectionService,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  @Post('start')
  async start(@CurrentUser() user: UserRequest) {
    return this.service.startConnection(user.uid);
  }

  @Get('status')
  async status(@CurrentUser() user: UserRequest) {
    return this.service.getStatus(user.uid);
  }

  @Public()
  @Get('oauth/callback')
  async callback(@Query('state') state: string, @Query('code') code: string, @Res() res: Response) {
    try {
      await this.service.handleCallback(state, code);
      this.redirectToCalendar(res, 'success');
    } catch {
      this.logger.error('Google Calendar OAuth callback failed');
      this.redirectToCalendar(res, 'error');
    }
  }

  private redirectToCalendar(res: Response, connection: 'success' | 'error') {
    const destination = new URL('/calendar', this.config.getOrThrow('WEB_APP_URL'));
    destination.searchParams.set('connection', connection);
    res.redirect(destination.toString());
  }
}
