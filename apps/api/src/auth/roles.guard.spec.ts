import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationMemberRole } from '@ijac/shared';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY, RequireRole } from './require-role.decorator';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function createContext(user?: { role?: string }): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows any caller when no role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createContext({ role: 'member' }))).toBe(true);
  });

  it('allows an admin on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([OrganizationMemberRole.ADMIN]);
    expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
  });

  it('rejects a member on an admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([OrganizationMemberRole.ADMIN]);
    expect(() => guard.canActivate(createContext({ role: 'member' }))).toThrow(ForbiddenException);
  });

  it('rejects a caller without a role', () => {
    reflector.getAllAndOverride.mockReturnValue([OrganizationMemberRole.ADMIN]);
    expect(() => guard.canActivate(createContext({}))).toThrow(ForbiddenException);
  });

  it('rejects a request without a user', () => {
    reflector.getAllAndOverride.mockReturnValue([OrganizationMemberRole.ADMIN]);
    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
  });

  it('stores the allowed roles as handler metadata', () => {
    class Probe {
      @RequireRole(OrganizationMemberRole.ADMIN)
      handler() {}
    }
    expect(Reflect.getMetadata(ROLES_KEY, Probe.prototype.handler)).toEqual([
      OrganizationMemberRole.ADMIN,
    ]);
  });
});
