import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrderListQueryDto } from './work-order.dto';
import { UserRequest } from '../auth/user-request';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  @Post()
  async create(@CurrentUser() user: UserRequest, @Body() dto: CreateWorkOrderDto) {
    return this.service.create(user.uid, dto);
  }

  @Get()
  async findMany(@CurrentUser() user: UserRequest, @Query() query: WorkOrderListQueryDto) {
    return this.service.findMany(user.uid, {
      status: query.status,
      priority: query.priority,
      clientId: query.clientId,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get(':id')
  async findById(@CurrentUser() user: UserRequest, @Param('id') id: string) {
    const workOrder = await this.service.findById(user.uid, id);
    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }
    return workOrder;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.service.update(user.uid, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: UserRequest, @Param('id') id: string) {
    await this.service.delete(user.uid, id);
  }
}
