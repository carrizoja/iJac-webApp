import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { UserRequest } from './user-request';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ApiEnvironment } from '../config/env';

@Injectable()
export class OrganizationAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<ApiEnvironment>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: UserRequest }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if ((this.config.get('REPOSITORY_MODE') ?? 'global') === 'global') {
      return true;
    }

    if (!user.organizationId) {
      throw new ForbiddenException(
        'Active organization membership required',
      );
    }

    if (!user.role) {
      throw new ForbiddenException(
        'Active organization membership required',
      );
    }

    return true;
  }
}
