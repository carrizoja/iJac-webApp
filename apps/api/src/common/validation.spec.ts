import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { ValidationError } from './errors';
import { createValidationPipe } from './validation';

class IssuerDto {
  @IsString()
  cuit!: string;
}

class ItemDto {
  @IsNumber()
  amount!: number;
}

class FlatDto {
  @IsString()
  name!: string;
}

class NestedDto {
  @ValidateNested()
  @Type(() => IssuerDto)
  issuer!: IssuerDto;
}

class ArrayDto {
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];
}

async function failure(metatype: new () => object, value: unknown): Promise<ValidationError> {
  const pipe = createValidationPipe();
  try {
    await pipe.transform(value, { type: 'body', metatype });
  } catch (error) {
    return error as ValidationError;
  }
  throw new Error('expected validation to fail');
}

describe('createValidationPipe', () => {
  it('reports flat field errors with the first constraint message', async () => {
    const error = await failure(FlatDto, {});

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors).toEqual({ name: 'name must be a string' });
    expect(error.message).toBe('name must be a string');
  });

  it('flattens nested object failures into dotted keys', async () => {
    const error = await failure(NestedDto, { issuer: {} });

    expect(error.fieldErrors).toEqual({ 'issuer.cuit': 'cuit must be a string' });
    expect(error.message).toBe('issuer.cuit must be a string');
  });

  it('flattens nested array failures into indexed dotted keys', async () => {
    const error = await failure(ArrayDto, { items: [{ amount: 1 }, { amount: 'x' }] });

    expect(error.fieldErrors).toEqual({
      'items.1.amount': 'amount must be a number conforming to the specified constraints',
    });
    expect(error.message).toContain('items.1.amount');
  });

  it('never returns an error without field errors', async () => {
    const error = await failure(NestedDto, { issuer: 'nope' });

    expect(Object.keys(error.fieldErrors ?? {}).length).toBeGreaterThan(0);
  });
});
