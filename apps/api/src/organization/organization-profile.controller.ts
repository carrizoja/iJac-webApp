import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  OrganizationMemberRole,
  OrganizationProfile,
  OrganizationProfileResponse,
} from '@ijac/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireRole } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { UpdateOrganizationProfileDto } from './organization-profile.dto';
import { OrganizationProfileService } from './organization-profile.service';

@Controller('organization/profile')
export class OrganizationProfileController {
  constructor(private readonly service: OrganizationProfileService) {}

  @Get()
  async get(@CurrentUser() user: UserRequest): Promise<OrganizationProfileResponse> {
    const status = await this.service.get(user.organizationId!);
    return { ...status, canEdit: user.role === OrganizationMemberRole.ADMIN };
  }

  @Put()
  @RequireRole(OrganizationMemberRole.ADMIN)
  async put(
    @CurrentUser() user: UserRequest,
    @Body() dto: UpdateOrganizationProfileDto,
  ): Promise<OrganizationProfile> {
    return this.service.save(user.organizationId!, dto);
  }
}
