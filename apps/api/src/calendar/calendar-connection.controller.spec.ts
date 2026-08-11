import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { ApiEnvironment } from '../config/env';
import { CalendarConnectionController } from './calendar-connection.controller';
import { CalendarConnectionService } from './calendar-connection.service';

describe('CalendarConnectionController', () => {
  const service = {
    startConnection: jest.fn(),
    getStatus: jest.fn(),
    handleCallback: jest.fn(),
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('http://localhost:4321'),
  };
  let controller: CalendarConnectionController;
  let response: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CalendarConnectionController(
      service as unknown as CalendarConnectionService,
      config as unknown as ConfigService<ApiEnvironment>,
    );
    response = { redirect: jest.fn() } as unknown as Response;
  });

  it('exposes the authenticated start action as POST', async () => {
    service.startConnection.mockResolvedValue({
      authorizationUrl: 'https://example.com',
      nonce: 'nonce',
    });

    await controller.start({ uid: 'uid-1' } as never);

    expect(Reflect.getMetadata(PATH_METADATA, controller.start)).toBe('start');
    expect(Reflect.getMetadata(METHOD_METADATA, controller.start)).toBe(RequestMethod.POST);
    expect(service.startConnection).toHaveBeenCalledWith('uid-1');
  });

  it('marks only the OAuth callback as public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.callback)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.start)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.status)).toBeUndefined();
  });

  it('redirects a successful callback to the absolute frontend calendar URL', async () => {
    service.handleCallback.mockResolvedValue(undefined);

    await controller.callback('state', 'code', response);

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:4321/calendar?connection=success',
    );
  });

  it('redirects a failed callback to the absolute frontend calendar URL', async () => {
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service.handleCallback.mockRejectedValue(
      new Error('exchange failed: code=secret-code state=secret-state token=secret-token'),
    );

    await controller.callback('state', 'code', response);

    expect(logger).toHaveBeenCalledWith('Google Calendar OAuth callback failed');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secret');
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:4321/calendar?connection=error',
    );
  });
});
