import { ValidationError } from '../common/errors';
import { createValidationPipe } from '../common/validation';
import { UpdateOrganizationProfileDto } from './organization-profile.dto';

const pipe = createValidationPipe();
const validate = (body: unknown) =>
  pipe.transform(body, {
    type: 'body',
    metatype: UpdateOrganizationProfileDto,
  });

const valid = {
  businessName: 'iJac',
  cuit: '20-12345678-6',
  address: 'Calle 1',
  phone: '555',
};

describe('UpdateOrganizationProfileDto', () => {
  it('accepts a complete profile and trims whitespace', async () => {
    const dto = (await validate({
      ...valid,
      businessName: '  iJac  ',
    })) as UpdateOrganizationProfileDto;

    expect(dto.businessName).toBe('iJac');
  });

  it.each(['businessName', 'cuit', 'address', 'phone'])(
    'reports a field-level error when %s is missing',
    async (field) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];

      const error = await validate(body).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(Object.keys((error as ValidationError).fieldErrors ?? {})).toEqual([field]);
    },
  );

  it('reports a field-level error when a field is blank after trimming', async () => {
    const error = await validate({ ...valid, address: '   ' }).catch((e: unknown) => e);

    expect((error as ValidationError).fieldErrors).toEqual({
      address: expect.any(String),
    });
  });

  it('rejects unknown properties', async () => {
    const error = await validate({ ...valid, updatedAt: 'x' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
  });
});
