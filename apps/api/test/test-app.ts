import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { FirebaseAuthGuard } from '../src/auth/firebase-auth.guard';
import { UserRequest } from '../src/auth/user-request';
import request from 'supertest';

export async function createTestApp(
  authenticatedUser: { uid: string; email: string } | null = { uid: 'test-user', email: 'test@ijac.com.ar' },
): Promise<{ app: INestApplication; cleanup: () => Promise<void> }> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (authenticatedUser) {
    moduleBuilder.overrideGuard(FirebaseAuthGuard).useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        request.user = { uid: authenticatedUser.uid, email: authenticatedUser.email } as UserRequest;
        return true;
      },
    });
  }

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication();
  app.useGlobalGuards(app.get(FirebaseAuthGuard));
  await app.init();

  return {
    app,
    cleanup: async () => {
      await app.close();
    },
  };
}

export function createAuthenticatedRequest(
  app: INestApplication,
  token: string = 'test-token',
) {
  return {
    get: (path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) => request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string) => request(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${token}`),
    delete: (path: string) => request(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${token}`),
  };
}
