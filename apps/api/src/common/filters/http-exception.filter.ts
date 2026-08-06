import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiError } from '../errors';

interface ErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const status = this.resolveStatus(exception);
    const errorResponse = this.resolveResponse(exception, request.requestId);

    response.status(status).json({ error: errorResponse });
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof ApiError) {
      return exception.statusCode;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveResponse(exception: unknown, requestId?: string): ErrorResponse {
    if (exception instanceof ApiError) {
      return {
        code: exception.code,
        message: exception.message,
        ...(exception.fieldErrors ? { fieldErrors: exception.fieldErrors } : {}),
        requestId,
      };
    }

    if (exception instanceof UnauthorizedException) {
      return { code: 'UNAUTHORIZED', message: exception.message, requestId };
    }

    if (exception instanceof ForbiddenException) {
      return { code: 'FORBIDDEN', message: exception.message, requestId };
    }

    if (exception instanceof NotFoundException) {
      return { code: 'NOT_FOUND', message: exception.message, requestId };
    }

    if (exception instanceof ConflictException) {
      return { code: 'CONFLICT', message: exception.message, requestId };
    }

    if (exception instanceof InternalServerErrorException) {
      return { code: 'INTERNAL_SERVER_ERROR', message: exception.message, requestId };
    }

    if (exception instanceof BadRequestException) {
      const res = exception.getResponse() as { message?: string[] | string };
      return {
        code: 'VALIDATION_ERROR',
        message: this.formatValidationMessage(res.message),
        requestId,
      };
    }

    if (exception instanceof HttpException) {
      return {
        code: 'HTTP_ERROR',
        message: exception.message,
        requestId,
      };
    }

    if (exception instanceof Error) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        requestId,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId,
    };
  }

  private formatValidationMessage(message: string[] | string | undefined): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    return message ?? 'Validation failed';
  }
}
