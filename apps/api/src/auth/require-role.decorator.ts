import { SetMetadata } from '@nestjs/common';
import { OrganizationMemberRole } from '@ijac/shared';

export const ROLES_KEY = 'requiredRoles';
export const RequireRole = (...roles: OrganizationMemberRole[]) => SetMetadata(ROLES_KEY, roles);
