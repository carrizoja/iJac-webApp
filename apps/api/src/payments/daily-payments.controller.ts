import { Controller, Get, Query } from '@nestjs/common';
import { Matches } from 'class-validator';
import { DailyPaymentsResponse } from '@ijac/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRequest } from '../auth/user-request';
import { PaymentService } from './payment.service';

class DailyPaymentsQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be a YYYY-MM-DD date' })
  date!: string;
}

/**
 * Payments across work orders, for one payment date. Like the payments of an order, it is open
 * to every member and always scoped to the caller's organization.
 */
@Controller('payments')
export class DailyPaymentsController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  async list(
    @CurrentUser() user: UserRequest,
    @Query() query: DailyPaymentsQueryDto,
  ): Promise<DailyPaymentsResponse> {
    return this.service.listByDate(user.organizationId!, query.date);
  }
}
