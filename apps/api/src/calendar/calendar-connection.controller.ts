import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CalendarConnectionService } from './calendar-connection.service';
import { UserRequest } from '../auth/user-request';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('calendar/connection')
export class CalendarConnectionController {
  constructor(private readonly service: CalendarConnectionService) {}

  @Get('start')
  async start(@CurrentUser() user: UserRequest) {
    return this.service.startConnection(user.uid);
  }

  @Get('status')
  async status(@CurrentUser() user: UserRequest) {
    return this.service.getStatus(user.uid);
  }

  @Get('oauth/callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    try {
      await this.service.handleCallback(state, code);
      res.redirect('/calendar?connection=success');
    } catch (err) {
      res.redirect('/calendar?connection=error');
    }
  }
}
