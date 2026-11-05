import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateOrganizationProfileDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName!: string;

  /** Accepts separators; the service normalizes and checks the check digit. */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cuit!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone!: string;

  /** Name printed under the receipt signature line; blank clears it. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  signatoryName?: string;
}
