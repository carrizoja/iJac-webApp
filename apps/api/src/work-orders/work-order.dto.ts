import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsISO8601,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Currency, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;

  @IsEnum(WorkOrderPriority)
  priority!: WorkOrderPriority;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  totalPriceMinor?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(Currency)
  currency?: Currency;
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  totalPriceMinor?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(Currency)
  currency?: Currency;
}

export class WorkOrderListQueryDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsISO8601()
  dueDateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}
