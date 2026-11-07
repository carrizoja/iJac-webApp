import { Controller, Get } from '@nestjs/common';
import { CurrentMemberResponse, OrganizationMemberRole } from '@ijac/shared';
import { CurrentUser } from './current-user.decorator';
import { UserRequest } from './user-request';

/** The signed-in member's role, so the web app can show only the actions they may take. */
@Controller('me')
export class MeController {
  @Get()
  get(@CurrentUser() user: UserRequest): CurrentMemberResponse {
    // The organization guard only lets members with a role through.
    return { role: user.role as OrganizationMemberRole };
  }
}
