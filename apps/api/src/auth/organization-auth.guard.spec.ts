import { OrganizationAuthGuard } from './organization-auth.guard';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ApiEnvironment } from '../config/env';

class MockReflector {
  private metadata: Record<string, unknown> = {};

  set(key: string, value: unknown) {
    this.metadata[key] = value;
  }

  getAllAndOverride<T>(key: string): T | undefined {
    return this.metadata[key] as T | undefined;
  }
}

describe('OrganizationAuthGuard', () => {
  let guard: OrganizationAuthGuard;
  let reflector: MockReflector;
  let config: { get: jest.Mock };

  beforeEach(() => {
    reflector = new MockReflector();
    config = { get: jest.fn().mockReturnValue('organization') };
    guard = new OrganizationAuthGuard(
      reflector as unknown as Reflector,
      config as unknown as ConfigService<ApiEnvironment>,
    );
  });

  function createContext(user?: {
    uid: string;
    organizationId?: string;
    role?: string;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows public routes', async () => {
    reflector.set('isPublic', true);
    const result = await guard.canActivate(createContext());
    expect(result).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    reflector.set('isPublic', false);
    await expect(
      guard.canActivate(createContext()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing organization membership', async () => {
    reflector.set('isPublic', false);
    await expect(
      guard.canActivate(createContext({ uid: 'user-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing role', async () => {
    reflector.set('isPublic', false);
    await expect(
      guard.canActivate(
        createContext({ uid: 'user-1', organizationId: 'org-1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows active organization members', async () => {
    reflector.set('isPublic', false);
    const result = await guard.canActivate(
      createContext({
        uid: 'user-1',
        organizationId: 'org-1',
        role: 'member',
      }),
    );
    expect(result).toBe(true);
  });

  it('allows authenticated users without membership in global mode', async () => {
    reflector.set('isPublic', false);
    config.get.mockReturnValue('global');

    await expect(
      guard.canActivate(createContext({ uid: 'user-1' })),
    ).resolves.toBe(true);
  });
});
