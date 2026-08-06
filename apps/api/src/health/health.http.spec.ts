import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { HealthModule } from './health.module';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiEnvironment } from '../config/env';

describe('GET /api/health (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);
    const config = app.get(ConfigService) as ConfigService<ApiEnvironment>;
    app.useGlobalGuards(new FirebaseAuthGuard(reflector, config));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns service status without an authorization token', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });
});
