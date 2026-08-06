import { Module } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';
import { FirestoreWorkOrderRepository } from './firestore-work-order.repository';
import { WORK_ORDER_REPOSITORY } from './work-order.constants';

@Module({
  controllers: [WorkOrderController],
  providers: [
    WorkOrderService,
    {
      provide: WORK_ORDER_REPOSITORY,
      useClass: FirestoreWorkOrderRepository,
    },
  ],
  exports: [WorkOrderService, WORK_ORDER_REPOSITORY],
})
export class WorkOrderModule {}
