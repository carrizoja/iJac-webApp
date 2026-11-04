import { ValidationError } from '../common/errors';
import { createValidationPipe } from '../common/validation';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './work-order.dto';

const pipe = createValidationPipe();
const validate = (metatype: new () => object, body: unknown) =>
  pipe.transform(body, { type: 'body', metatype });

const base = { title: 'Setup', status: 'open', priority: 'normal', clientId: 'c1' };

async function fieldErrorsOf(metatype: new () => object, body: unknown) {
  const error = await validate(metatype, body).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ValidationError);
  return Object.keys((error as ValidationError).fieldErrors ?? {});
}

describe('work order pricing DTO validation', () => {
  it('accepts a priced work order', async () => {
    const dto = (await validate(CreateWorkOrderDto, {
      ...base,
      totalPriceMinor: 15000000,
      currency: 'ARS',
    })) as CreateWorkOrderDto;
    expect(dto.totalPriceMinor).toBe(15000000);
    expect(dto.currency).toBe('ARS');
  });

  it('accepts an unpriced work order and a zero price', async () => {
    await expect(validate(CreateWorkOrderDto, base)).resolves.toBeDefined();
    await expect(
      validate(CreateWorkOrderDto, { ...base, totalPriceMinor: 0, currency: 'USD' }),
    ).resolves.toBeDefined();
  });

  it.each([-1, 1.5, '100', Number.MAX_SAFE_INTEGER + 2])(
    'rejects totalPriceMinor %p',
    async (value) => {
      expect(
        await fieldErrorsOf(CreateWorkOrderDto, {
          ...base,
          totalPriceMinor: value,
          currency: 'ARS',
        }),
      ).toEqual(['totalPriceMinor']);
    },
  );

  it('rejects a currency outside ARS and USD', async () => {
    expect(
      await fieldErrorsOf(CreateWorkOrderDto, { ...base, totalPriceMinor: 100, currency: 'EUR' }),
    ).toEqual(['currency']);
  });

  it('accepts null to clear the price on update, but not a null currency', async () => {
    await expect(validate(UpdateWorkOrderDto, { totalPriceMinor: null })).resolves.toBeDefined();
    expect(await fieldErrorsOf(UpdateWorkOrderDto, { currency: null })).toEqual(['currency']);
  });
});
