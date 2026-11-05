import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { BrandingImage, BrandingImageResponse, OrganizationMemberRole } from '@ijac/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireRole } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { UpdateBrandingImageDto } from './organization-branding.dto';
import { OrganizationBrandingService } from './organization-branding.service';

/** Logo and signature printed on receipts; `:kind` is `logo` or `signature`. */
@Controller('organization/branding')
export class OrganizationBrandingController {
  constructor(private readonly service: OrganizationBrandingService) {}

  @Get(':kind')
  async get(
    @CurrentUser() user: UserRequest,
    @Param('kind') kind: string,
  ): Promise<BrandingImageResponse> {
    return { image: await this.service.get(user.organizationId!, kind) };
  }

  @Put(':kind')
  @RequireRole(OrganizationMemberRole.ADMIN)
  async put(
    @CurrentUser() user: UserRequest,
    @Param('kind') kind: string,
    @Body() dto: UpdateBrandingImageDto,
  ): Promise<BrandingImage> {
    return this.service.save(user.organizationId!, kind, dto);
  }

  @Delete(':kind')
  @HttpCode(204)
  @RequireRole(OrganizationMemberRole.ADMIN)
  async remove(@CurrentUser() user: UserRequest, @Param('kind') kind: string): Promise<void> {
    await this.service.remove(user.organizationId!, kind);
  }
}
