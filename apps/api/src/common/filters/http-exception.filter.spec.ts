import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(requestId = 'req-1') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ requestId, method: 'POST', url: '/api/calendar/sync' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs an unexpected error with its stack and still returns a generic 500', () => {
    const { host, status, json } = createHost();
    const error = new Error('Cannot use "undefined" as a Firestore value');

    new HttpExceptionFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error', requestId: 'req-1' },
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, stack] = errorSpy.mock.calls[0];
    expect(message).toContain('POST /api/calendar/sync');
    expect(message).toContain('req-1');
    expect(message).toContain('Cannot use "undefined" as a Firestore value');
    expect(stack).toBe(error.stack);
  });

  it('does not log expected HTTP errors', () => {
    const { host, status } = createHost();

    new HttpExceptionFilter().catch(new NotFoundException('Work order not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
