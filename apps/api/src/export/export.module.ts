import { Module } from '@nestjs/common';
import { ClientModule } from '../clients/client.module';
import { PaymentModule } from '../payments/payment.module';
import { WorkOrderModule } from '../work-orders/work-order.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [ClientModule, WorkOrderModule, PaymentModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
