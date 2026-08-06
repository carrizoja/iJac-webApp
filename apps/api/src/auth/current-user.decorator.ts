import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRequest } from './user-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserRequest => {
    const request = ctx.switchToHttp().getRequest<{ user: UserRequest }>();
    return request.user;
  },
);
