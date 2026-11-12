import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { OrganizationMemberRole } from '@ijac/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireRole } from '../auth/require-role.decorator';
import { UserRequest } from '../auth/user-request';
import { exportFileName } from './export-file-name';
import { buildWorkbook } from './export-workbook';
import { ExportService } from './export.service';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const JSON_TYPE = 'application/json; charset=utf-8';

/**
 * A full copy of the caller's organization data, for admins only. The files
 * hold personal data, so they are never cached.
 */
@Controller()
@RequireRole(OrganizationMemberRole.ADMIN)
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Get('export.xlsx')
  @Header('Cache-Control', 'no-store')
  async excel(@CurrentUser() user: UserRequest): Promise<StreamableFile> {
    const exportedAt = new Date();
    const data = await this.service.collect(user.organizationId!, exportedAt);
    const bytes = await buildWorkbook(data).xlsx.writeBuffer();
    return new StreamableFile(Buffer.from(bytes as ArrayBuffer), {
      type: XLSX_TYPE,
      disposition: `attachment; filename="${exportFileName(exportedAt, 'xlsx')}"`,
    });
  }

  @Get('export.json')
  @Header('Cache-Control', 'no-store')
  async json(@CurrentUser() user: UserRequest): Promise<StreamableFile> {
    const exportedAt = new Date();
    const data = await this.service.collect(user.organizationId!, exportedAt);
    return new StreamableFile(Buffer.from(JSON.stringify(data, null, 2), 'utf8'), {
      type: JSON_TYPE,
      disposition: `attachment; filename="${exportFileName(exportedAt, 'json')}"`,
    });
  }
}
