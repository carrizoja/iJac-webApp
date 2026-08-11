import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { OAuthTransactionRepository } from './oauth-transaction.repository';
import { CalendarConnectionRepository } from './connection.repository';
import { CredentialEncryption } from './credential-encryption';
import { ApiEnvironment } from '../config/env';
import { OAUTH_TRANSACTION_REPOSITORY } from './oauth-transaction.constants';
import {
  CALENDAR_CONNECTION_REPOSITORY,
  GOOGLE_OAUTH_CLIENT,
} from './calendar-connection.constants';
import { randomUUID } from 'crypto';

export interface OAuthStartResult {
  authorizationUrl: string;
  nonce: string;
}

@Injectable()
export class CalendarConnectionService {
  private readonly logger = new Logger(CalendarConnectionService.name);
  private readonly encryption: CredentialEncryption;

  constructor(
    private readonly config: ConfigService<ApiEnvironment>,
    @Inject(OAUTH_TRANSACTION_REPOSITORY)
    private readonly oauthTransactionRepository: OAuthTransactionRepository,
    @Inject(CALENDAR_CONNECTION_REPOSITORY)
    private readonly connectionRepository: CalendarConnectionRepository,
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly oauthClient: OAuth2Client,
  ) {
    this.encryption = new CredentialEncryption(config.getOrThrow('CREDENTIAL_ENCRYPTION_KEY'));
  }

  async startConnection(uid: string): Promise<OAuthStartResult> {
    const nonce = randomUUID();
    const codeChallenge = randomUUID();
    const redirectUri = this.config.getOrThrow('GOOGLE_REDIRECT_URI');
    await this.oauthTransactionRepository.create({
      nonce,
      uid,
      codeChallenge,
      redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const authorizationUrl = this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      redirect_uri: redirectUri,
      state: nonce,
      include_granted_scopes: true,
      prompt: 'consent',
    });

    return { authorizationUrl, nonce };
  }

  async handleCallback(nonce: string, code: string): Promise<void> {
    const transaction = await this.runCallbackStage('transaction', async () => {
      const storedTransaction = await this.oauthTransactionRepository.findAndDelete(nonce);
      if (!storedTransaction || storedTransaction.expiresAt < new Date()) {
        throw new Error('Invalid or expired OAuth transaction');
      }
      return storedTransaction;
    });

    const { tokens } = await this.runCallbackStage('token_exchange', () =>
      this.oauthClient.getToken({
        code,
        redirect_uri: transaction.redirectUri,
      }),
    );

    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      this.logCallbackFailure('refresh_token');
      throw new Error('No refresh token received');
    }

    const encrypted = await this.runCallbackStage('encryption', () =>
      this.encryption.encrypt(refreshToken),
    );
    await this.runCallbackStage('persistence', () =>
      this.connectionRepository.save({
        uid: transaction.uid,
        connected: true,
        grantedScopes: tokens.scope?.split(' ') ?? [],
        credential: encrypted,
        status: 'active',
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  private async runCallbackStage<T>(
    stage: CallbackStage,
    operation: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logCallbackFailure(stage);
      throw error;
    }
  }

  private logCallbackFailure(stage: CallbackStage): void {
    this.logger.error(`Google Calendar OAuth callback failed at stage: ${stage}`);
  }

  async getStatus(uid: string): Promise<{ connected: boolean; status: string }> {
    const connection = await this.connectionRepository.findByUid(uid);
    if (!connection) {
      return { connected: false, status: 'disconnected' };
    }
    return { connected: connection.status === 'active', status: connection.status };
  }
}

type CallbackStage =
  'transaction' | 'token_exchange' | 'refresh_token' | 'encryption' | 'persistence';
