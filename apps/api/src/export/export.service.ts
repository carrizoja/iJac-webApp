import { Inject, Injectable } from '@nestjs/common';
import { DATA_EXPORT_FORMAT_VERSION, DataExport } from '@ijac/shared';
import { CLIENT_REPOSITORY } from '../clients/client.constants';
import { ClientRepository } from '../clients/client.repository';
import { PAYMENT_REPOSITORY } from '../payments/payment.constants';
import { PaymentRepository } from '../payments/payment.repository';
import { WORK_ORDER_REPOSITORY } from '../work-orders/work-order.constants';
import { WorkOrderRepository } from '../work-orders/work-order.repository';

/**
 * Reads one organization's records for the data export. Both export formats
 * render the same snapshot, so they always contain the same records.
 */
@Injectable()
export class ExportService {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
  ) {}

  async collect(organizationId: string, exportedAt: Date): Promise<DataExport> {
    const [clients, workOrders, payments] = await Promise.all([
      this.clients.listAll(organizationId),
      this.workOrders.listAll(organizationId),
      this.payments.listAll(organizationId),
    ]);
    return {
      formatVersion: DATA_EXPORT_FORMAT_VERSION,
      exportedAt: exportedAt.toISOString(),
      organizationId,
      clients,
      workOrders,
      payments,
    };
  }
}
