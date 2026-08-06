export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super('VALIDATION_ERROR', message, 400, fieldErrors);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ExternalServiceError extends ApiError {
  constructor(message: string) {
    super('EXTERNAL_SERVICE_ERROR', message, 502);
  }
}

export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super('INTERNAL_SERVER_ERROR', message, 500);
  }
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
  };
}
