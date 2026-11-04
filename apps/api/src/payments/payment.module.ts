import { Module } from '@nestjs/common';
import { WorkOrderModule } from '../work-orders/work-order.module';
import { FirestorePaymentRepository } from './firestore-payment.repository';
import { PAYMENT_REPOSITORY } from './payment.constants';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [WorkOrderModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    { provide: PAYMENT_REPOSITORY, useClass: FirestorePaymentRepository },
  ],
})
export class PaymentModule {}
