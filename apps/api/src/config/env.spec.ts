import { validateApiEnvironment } from './env';

const validEnv: Record<string, unknown> = {
  PORT: 3001,
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:4321',
  WEB_APP_URL: 'http://localhost:4321',
  ALLOWED_DOMAIN: 'ijacitsolutions.com',
  FIREBASE_PROJECT_ID: 'ijac-test-project',
  FIREBASE_CLIENT_EMAIL: 'service@ijac-test-project.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/calendar/connection/oauth/callback',
  CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
};

function without(...keys: string[]): Record<string, unknown> {
  const env = { ...validEnv };
  for (const key of keys) delete env[key];
  return env;
}

describe('validateApiEnvironment', () => {
  it('accepts a complete valid configuration', () => {
    const result = validateApiEnvironment({ ...validEnv });
    expect(result.FIREBASE_PROJECT_ID).toBe('ijac-test-project');
    expect(result.CORS_ORIGIN).toBe('http://localhost:4321');
    expect(result.WEB_APP_URL).toBe('http://localhost:4321');
  });

  it('accepts Application Default Credentials configuration', () => {
    const result = validateApiEnvironment(without('FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'));

    expect(result.FIREBASE_CLIENT_EMAIL).toBeUndefined();
    expect(result.FIREBASE_PRIVATE_KEY).toBeUndefined();
  });

  it('applies defaults for PORT, NODE_ENV, and ALLOWED_DOMAIN', () => {
    const result = validateApiEnvironment(without('PORT'));
    expect(result.PORT).toBe(3001);

    const withoutNodeEnv = validateApiEnvironment(without('NODE_ENV'));
    expect(withoutNodeEnv.NODE_ENV).toBe('development');

    const withoutDomain = validateApiEnvironment(without('ALLOWED_DOMAIN'));
    expect(withoutDomain.ALLOWED_DOMAIN).toBe('');
  });

  it.each([
    'CORS_ORIGIN',
    'WEB_APP_URL',
    'FIREBASE_PROJECT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'CREDENTIAL_ENCRYPTION_KEY',
  ])('rejects a missing required variable: %s', (key) => {
    expect(() => validateApiEnvironment(without(key))).toThrow(
      new RegExp(`Invalid API environment:.*${key}`),
    );
  });

  it.each(['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'])(
    'rejects partial explicit Firebase credentials without %s',
    (key) => {
      expect(() => validateApiEnvironment(without(key))).toThrow(
        /FIREBASE_CLIENT_EMAIL.*FIREBASE_PRIVATE_KEY|FIREBASE_PRIVATE_KEY.*FIREBASE_CLIENT_EMAIL/,
      );
    },
  );

  it('rejects an invalid FIREBASE_CLIENT_EMAIL', () => {
    expect(() =>
      validateApiEnvironment({ ...validEnv, FIREBASE_CLIENT_EMAIL: 'not-an-email' }),
    ).toThrow(/FIREBASE_CLIENT_EMAIL/);
  });

  it('rejects a non-URI GOOGLE_REDIRECT_URI', () => {
    expect(() => validateApiEnvironment({ ...validEnv, GOOGLE_REDIRECT_URI: 'not a uri' })).toThrow(
      /GOOGLE_REDIRECT_URI/,
    );
  });

  it('rejects a non-HTTP WEB_APP_URL', () => {
    expect(() => validateApiEnvironment({ ...validEnv, WEB_APP_URL: 'ftp://example.com' })).toThrow(
      /WEB_APP_URL/,
    );
  });
});
