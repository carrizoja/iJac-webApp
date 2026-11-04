import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationMemberRole } from '@ijac/shared';
import { UserRequest } from './user-request';
import { ROLES_KEY } from './require-role.decorator';

/** Enforces `@RequireRole(...)` using the role set by OrganizationAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrganizationMemberRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserRequest }>();
    const role = request.user?.role;
    if (!role || !required.includes(role as OrganizationMemberRole)) {
      throw new ForbiddenException('Insufficient role for this action');
    }

    return true;
  }
}
