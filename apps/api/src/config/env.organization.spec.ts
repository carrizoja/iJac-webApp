import { validateApiEnvironment } from './env';

describe('Organization-scoped configuration', () => {
  it('defaults to global repository mode until migration cutover', () => {
    const env = validateApiEnvironment({
      CORS_ORIGIN: 'http://localhost:3000',
      WEB_APP_URL: 'http://localhost:4321',
      FIREBASE_PROJECT_ID: 'test',
      FIREBASE_CLIENT_EMAIL: 'test@test.com',
      FIREBASE_PRIVATE_KEY: 'key',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REDIRECT_URI: 'http://localhost',
      CREDENTIAL_ENCRYPTION_KEY: 'key',
    });

    expect(env.REPOSITORY_MODE).toBe('global');
  });

  it('accepts global repository mode', () => {
    const env = validateApiEnvironment({
      CORS_ORIGIN: 'http://localhost:3000',
      WEB_APP_URL: 'http://localhost:4321',
      FIREBASE_PROJECT_ID: 'test',
      FIREBASE_CLIENT_EMAIL: 'test@test.com',
      FIREBASE_PRIVATE_KEY: 'key',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REDIRECT_URI: 'http://localhost',
      CREDENTIAL_ENCRYPTION_KEY: 'key',
      REPOSITORY_MODE: 'global',
    });

    expect(env.REPOSITORY_MODE).toBe('global');
  });

  it('rejects invalid repository mode', () => {
    expect(() =>
      validateApiEnvironment({
        CORS_ORIGIN: 'http://localhost:3000',
        WEB_APP_URL: 'http://localhost:4321',
        FIREBASE_PROJECT_ID: 'test',
        FIREBASE_CLIENT_EMAIL: 'test@test.com',
        FIREBASE_PRIVATE_KEY: 'key',
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
        GOOGLE_REDIRECT_URI: 'http://localhost',
        CREDENTIAL_ENCRYPTION_KEY: 'key',
        REPOSITORY_MODE: 'invalid',
      }),
    ).toThrow();
  });

  it('accepts default organization id', () => {
    const env = validateApiEnvironment({
      CORS_ORIGIN: 'http://localhost:3000',
      WEB_APP_URL: 'http://localhost:4321',
      FIREBASE_PROJECT_ID: 'test',
      FIREBASE_CLIENT_EMAIL: 'test@test.com',
      FIREBASE_PRIVATE_KEY: 'key',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REDIRECT_URI: 'http://localhost',
      CREDENTIAL_ENCRYPTION_KEY: 'key',
      DEFAULT_ORGANIZATION_ID: 'org-default',
    });

    expect(env.DEFAULT_ORGANIZATION_ID).toBe('org-default');
  });
});
