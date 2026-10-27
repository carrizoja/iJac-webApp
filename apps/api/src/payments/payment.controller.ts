import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  OrganizationMemberRole,
  Payment,
  PaymentActor,
  WorkOrderPaymentsResponse,
} from '@ijac/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireRole } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { RecordPaymentDto, VoidPaymentDto } from './payment.dto';
import { PaymentService } from './payment.service';

function toActor(user: UserRequest): PaymentActor {
  return { uid: user.uid, email: user.email, displayName: user.displayName ?? null };
}

@Controller('work-orders')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Get(':id/payments')
  async list(
    @CurrentUser() user: UserRequest,
    @Param('id') workOrderId: string,
  ): Promise<WorkOrderPaymentsResponse> {
    const result = await this.service.list(user.organizationId!, workOrderId);
    return { ...result, canManage: user.role === OrganizationMemberRole.ADMIN };
  }

  @Post(':id/payments')
  @RequireRole(OrganizationMemberRole.ADMIN)
  async record(
    @CurrentUser() user: UserRequest,
    @Param('id') workOrderId: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<Payment> {
    return this.service.record(user.organizationId!, workOrderId, dto, toActor(user));
  }

  @Post(':id/payments/:paymentId/void')
  @HttpCode(200)
  @RequireRole(OrganizationMemberRole.ADMIN)
  async voidPayment(
    @CurrentUser() user: UserRequest,
    @Param('id') workOrderId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: VoidPaymentDto,
  ): Promise<Payment> {
    return this.service.voidPayment(
      user.organizationId!,
      workOrderId,
      paymentId,
      dto.reason,
      toActor(user),
    );
  }
}
