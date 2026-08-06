import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto, UpdateClientDto, ClientListQueryDto } from './client.dto';
import { UserRequest } from '../auth/user-request';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('clients')
export class ClientController {
  constructor(private readonly service: ClientService) {}

  @Post()
  async create(@CurrentUser() user: UserRequest, @Body() dto: CreateClientDto) {
    return this.service.create(user.uid, dto);
  }

  @Get()
  async findMany(@CurrentUser() user: UserRequest, @Query() query: ClientListQueryDto) {
    return this.service.findMany(user.uid, {
      search: query.search,
      organization: query.organization,
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get(':id')
  async findById(@CurrentUser() user: UserRequest, @Param('id') id: string) {
    const client = await this.service.findById(user.uid, id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  @Patch(':id')
  async update(@CurrentUser() user: UserRequest, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(user.uid, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: UserRequest, @Param('id') id: string) {
    await this.service.delete(user.uid, id);
  }
}
