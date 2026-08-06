import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { CalendarConnectionService } from './calendar-connection.service';
import { OAuthTransactionRepository, OAuthTransaction } from './oauth-transaction.repository';
import { CalendarConnectionRepository } from './connection.repository';
import { OAUTH_TRANSACTION_REPOSITORY } from './oauth-transaction.constants';
import { CALENDAR_CONNECTION_REPOSITORY, GOOGLE_OAUTH_CLIENT } from './calendar-connection.constants';

class InMemoryOAuthTransactionRepository implements OAuthTransactionRepository {
  private transactions: Map<string, OAuthTransaction> = new Map();

  async create(transaction: OAuthTransaction): Promise<void> {
    this.transactions.set(transaction.nonce, transaction);
  }

  async findAndDelete(nonce: string): Promise<OAuthTransaction | null> {
    const transaction = this.transactions.get(nonce);
    this.transactions.delete(nonce);
    return transaction ?? null;
  }
}

class InMemoryCalendarConnectionRepository implements CalendarConnectionRepository {
  private connections: Map<string, import('./connection.repository').CalendarConnection> = new Map();

  async save(connection: import('./connection.repository').CalendarConnection): Promise<void> {
    this.connections.set(connection.uid, connection);
  }

  async findByUid(uid: string): Promise<import('./connection.repository').CalendarConnection | null> {
    return this.connections.get(uid) ?? null;
  }

  async updateStatus(): Promise<void> {}
}

function createMockOAuthClient(
  getTokenResult: { refresh_token?: string; scope?: string } | Error,
  generateUrl?: string,
): OAuth2Client {
  return {
    generateAuthUrl: () => generateUrl ?? 'https://accounts.google.com/oauth?mock',
    getToken: async () => {
      if (getTokenResult instanceof Error) {
        throw getTokenResult;
      }
      return { tokens: getTokenResult } as any;
    },
} as unknown as OAuth2Client;
}

describe('CalendarConnectionService', () => {
  let service: CalendarConnectionService;
  let oauthRepo: InMemoryOAuthTransactionRepository;
  let connectionRepo: InMemoryCalendarConnectionRepository;
  let mockOAuthClient: OAuth2Client;

  beforeEach(async () => {
    oauthRepo = new InMemoryOAuthTransactionRepository();
    connectionRepo = new InMemoryCalendarConnectionRepository();
    mockOAuthClient = createMockOAuthClient({ refresh_token: 'refresh-token', scope: 'https://www.googleapis.com/auth/calendar' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarConnectionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
                GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/calendar/connection/oauth/callback',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
              };
              return values[key];
            },
          },
        },
        {
          provide: OAUTH_TRANSACTION_REPOSITORY,
          useValue: oauthRepo,
        },
        {
          provide: CALENDAR_CONNECTION_REPOSITORY,
          useValue: connectionRepo,
        },
        {
          provide: GOOGLE_OAUTH_CLIENT,
          useValue: mockOAuthClient,
        },
      ],
    }).compile();
    service = module.get(CalendarConnectionService);
  });

  it('creates a start URL and stores a transaction', async () => {
    const result = await service.startConnection('uid-1');
    expect(result.authorizationUrl).toContain('accounts.google.com');
    const stored = await oauthRepo.findAndDelete(result.nonce);
    expect(stored).toBeDefined();
    expect(stored?.uid).toBe('uid-1');
  });

  it('returns disconnected status when no connection exists', async () => {
    const status = await service.getStatus('uid-1');
    expect(status.connected).toBe(false);
    expect(status.status).toBe('disconnected');
  });

  it('persists encrypted credentials after a valid callback', async () => {
    const start = await service.startConnection('uid-1');
    await service.handleCallback(start.nonce, 'auth-code');
    const status = await service.getStatus('uid-1');
    expect(status.connected).toBe(true);
    expect(status.status).toBe('active');
    const connection = await connectionRepo.findByUid('uid-1');
    expect(connection).toBeDefined();
    expect(connection?.credential).toBeDefined();
    expect(connection?.credential.encrypted).not.toBe('refresh-token');
    expect(connection?.grantedScopes).toContain('https://www.googleapis.com/auth/calendar');
  });

  it('rejects a callback with an unknown nonce', async () => {
    await expect(service.handleCallback('unknown-nonce', 'code')).rejects.toThrow('Invalid or expired OAuth transaction');
  });

  it('rejects a callback with an expired transaction', async () => {
    const nonce = 'expired-nonce';
    await oauthRepo.create({
      nonce,
      uid: 'uid-1',
      codeChallenge: 'challenge',
      redirectUri: 'http://localhost/callback',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.handleCallback(nonce, 'code')).rejects.toThrow('Invalid or expired OAuth transaction');
  });

  it('rejects a callback when no refresh token is returned', async () => {
    mockOAuthClient = createMockOAuthClient({ scope: 'calendar' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarConnectionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
                GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/calendar/connection/oauth/callback',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
              };
              return values[key];
            },
          },
        },
        {
          provide: OAUTH_TRANSACTION_REPOSITORY,
          useValue: oauthRepo,
        },
        {
          provide: CALENDAR_CONNECTION_REPOSITORY,
          useValue: connectionRepo,
        },
        {
          provide: GOOGLE_OAUTH_CLIENT,
          useValue: mockOAuthClient,
        },
      ],
    }).compile();
    const testService = module.get(CalendarConnectionService);
    const start = await testService.startConnection('uid-1');
    await expect(testService.handleCallback(start.nonce, 'code')).rejects.toThrow('No refresh token received');
  });

  it('rejects a callback when token exchange fails', async () => {
    mockOAuthClient = createMockOAuthClient(new Error('Token exchange failed'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarConnectionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
                GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/calendar/connection/oauth/callback',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
              };
              return values[key];
            },
          },
        },
        {
          provide: OAUTH_TRANSACTION_REPOSITORY,
          useValue: oauthRepo,
        },
        {
          provide: CALENDAR_CONNECTION_REPOSITORY,
          useValue: connectionRepo,
        },
        {
          provide: GOOGLE_OAUTH_CLIENT,
          useValue: mockOAuthClient,
        },
      ],
    }).compile();
    const testService = module.get(CalendarConnectionService);
    const start = await testService.startConnection('uid-1');
    await expect(testService.handleCallback(start.nonce, 'code')).rejects.toThrow('Token exchange failed');
  });
});
