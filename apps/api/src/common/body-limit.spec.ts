import { Body, Controller, Post } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BRANDING_MAX_BYTES } from '@ijac/shared';
import { configureBodyParser } from './body-limit';

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: { data: string }) {
    return { length: body.data.length };
  }
}

describe('configureBodyParser', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [EchoController] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureBodyParser(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a JSON body carrying a maximum-size branding image in base64', async () => {
    const data = Buffer.alloc(BRANDING_MAX_BYTES, 1).toString('base64');

    const response = await request(app.getHttpServer())
      .post('/echo')
      .send({ contentType: 'image/png', data });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ length: data.length });
  });

  it('rejects a JSON body larger than the limit', async () => {
    const response = await request(app.getHttpServer())
      .post('/echo')
      .send({ data: 'a'.repeat(600 * 1024) });

    expect(response.status).toBe(413);
  });
});
