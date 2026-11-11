import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { DailyPaymentsController } from './daily-payments.controller';
import { PaymentService } from './payment.service';

const member: UserRequest = {
  uid: 'u2',
  email: 'm@x.test',
  displayName: 'Mo',
  photoURL: null,
  organizationId: 'org-1',
  role: 'member',
} as unknown as UserRequest;

describe('DailyPaymentsController', () => {
  let service: { listByDate: jest.Mock };
  let controller: DailyPaymentsController;

  beforeEach(() => {
    service = {
      listByDate: jest.fn().mockResolvedValue({ date: '2026-11-11', items: [], totals: [] }),
    };
    controller = new DailyPaymentsController(service as unknown as PaymentService);
  });

  it("lists the day's payments of the caller organization only", async () => {
    await expect(controller.list(member, { date: '2026-11-11' })).resolves.toEqual({
      date: '2026-11-11',
      items: [],
      totals: [],
    });
    expect(service.listByDate).toHaveBeenCalledWith('org-1', '2026-11-11');
  });

  it('is open to every member, like the payments of an order', () => {
    const handler = DailyPaymentsController.prototype.list;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
    const context = {
      getHandler: () => handler,
      getClass: () => DailyPaymentsController,
      switchToHttp: () => ({ getRequest: () => ({ user: member }) }),
    } as unknown as ExecutionContext;
    expect(new RolesGuard(new Reflector()).canActivate(context)).toBe(true);
  });

  it('is served at GET /payments', () => {
    expect(Reflect.getMetadata('path', DailyPaymentsController)).toBe('payments');
    expect(Reflect.getMetadata('path', DailyPaymentsController.prototype.list)).toBe('/');
  });
});
