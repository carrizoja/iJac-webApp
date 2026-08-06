import { FirebaseAuthGuard } from './firebase-auth.guard';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
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

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let reflector: MockReflector;
  let config: ConfigService<ApiEnvironment>;

  beforeEach(() => {
    reflector = new MockReflector();
    config = { get: jest.fn() } as unknown as ConfigService<ApiEnvironment>;
    guard = new FirebaseAuthGuard(reflector as unknown as Reflector, config);
  });

  function createContext(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows public routes', async () => {
    reflector.set('isPublic', true);
    const result = await guard.canActivate(createContext({}));
    expect(result).toBe(true);
  });

  it('rejects missing token', async () => {
    reflector.set('isPublic', false);
    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed token', async () => {
    reflector.set('isPublic', false);
    await expect(
      guard.canActivate(createContext({ authorization: 'Basic abc' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('extracts bearer token from header', () => {
    const extract = (guard as unknown as { extractToken: (req: { headers: { authorization?: string } }) => string | null }).extractToken;
    expect(extract({ headers: { authorization: 'Bearer valid-token' } })).toBe('valid-token');
    expect(extract({ headers: {} })).toBeNull();
    expect(extract({ headers: { authorization: 'Basic abc' } })).toBeNull();
  });
});
