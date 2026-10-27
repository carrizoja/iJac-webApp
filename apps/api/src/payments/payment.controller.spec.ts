import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Currency, OrganizationMemberRole, PaymentMethod } from '@ijac/shared';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

const admin: UserRequest = {
  uid: 'u1',
  email: 'a@x.test',
  displayName: 'Ada',
  photoURL: 'https://x.test/p.png',
  organizationId: 'org-1',
  role: 'admin',
};
const member: UserRequest = { ...admin, uid: 'u2', role: 'member' };
const actor = { uid: 'u1', email: 'a@x.test', displayName: 'Ada' };

const balance = {
  currency: Currency.ARS,
  totalMinor: 100,
  paidMinor: 0,
  remainingMinor: 100,
};

describe('PaymentController', () => {
  let service: { list: jest.Mock; record: jest.Mock; voidPayment: jest.Mock };
  let controller: PaymentController;

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue({ items: [], balance }),
      record: jest.fn().mockResolvedValue({ id: 'p1' }),
      voidPayment: jest.fn().mockResolvedValue({ id: 'p1' }),
    };
    controller = new PaymentController(service as unknown as PaymentService);
  });

  it('lists payments of the caller organization with manage permission for an admin', async () => {
    await expect(controller.list(admin, 'wo-1')).resolves.toEqual({
      items: [],
      balance,
      canManage: true,
    });
    expect(service.list).toHaveBeenCalledWith('org-1', 'wo-1');
  });

  it('lists payments without manage permission for a member', async () => {
    await expect(controller.list(member, 'wo-1')).resolves.toEqual(
      expect.objectContaining({ canManage: false }),
    );
  });

  it('records a payment attributing it to the caller', async () => {
    const dto = { amountMinor: 5, paymentDate: '2026-08-10', method: PaymentMethod.CASH };
    await expect(controller.record(admin, 'wo-1', dto)).resolves.toEqual({ id: 'p1' });
    expect(service.record).toHaveBeenCalledWith('org-1', 'wo-1', dto, actor);
  });

  it('voids a payment attributing it to the caller', async () => {
    await controller.voidPayment(admin, 'wo-1', 'p1', { reason: 'Error' });
    expect(service.voidPayment).toHaveBeenCalledWith('org-1', 'wo-1', 'p1', 'Error', actor);
  });

  it('keeps missing identity fields as null in the actor', async () => {
    const bare: UserRequest = { uid: 'u3', email: null, organizationId: 'org-1', role: 'admin' };
    await controller.voidPayment(bare, 'wo-1', 'p1', { reason: 'Error' });
    expect(service.voidPayment).toHaveBeenCalledWith('org-1', 'wo-1', 'p1', 'Error', {
      uid: 'u3',
      email: null,
      displayName: null,
    });
  });

  describe('role enforcement', () => {
    const guard = new RolesGuard(new Reflector());
    const contextFor = (
      handler: (...args: never[]) => unknown,
      user: UserRequest,
    ): ExecutionContext =>
      ({
        getHandler: () => handler,
        getClass: () => PaymentController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as unknown as ExecutionContext;

    it('requires admin to record and void', () => {
      for (const handler of [
        PaymentController.prototype.record,
        PaymentController.prototype.voidPayment,
      ]) {
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([OrganizationMemberRole.ADMIN]);
        expect(guard.canActivate(contextFor(handler, admin))).toBe(true);
        expect(() => guard.canActivate(contextFor(handler, member))).toThrow(ForbiddenException);
      }
    });

    it('leaves listing open to every member', () => {
      const handler = PaymentController.prototype.list;
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
      expect(guard.canActivate(contextFor(handler, member))).toBe(true);
    });
  });

  it('maps the routes under work-orders', () => {
    const path = (handler: unknown) => Reflect.getMetadata('path', handler as object);
    expect(Reflect.getMetadata('path', PaymentController)).toBe('work-orders');
    expect(path(PaymentController.prototype.list)).toBe(':id/payments');
    expect(path(PaymentController.prototype.record)).toBe(':id/payments');
    expect(path(PaymentController.prototype.voidPayment)).toBe(':id/payments/:paymentId/void');
  });
});
