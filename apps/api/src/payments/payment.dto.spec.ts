import { PaymentMethod } from '@ijac/shared';
import { ValidationError } from '../common/errors';
import { createValidationPipe } from '../common/validation';
import { RecordPaymentDto, VoidPaymentDto } from './payment.dto';

const pipe = createValidationPipe();
const validate = (body: unknown, metatype: new () => object) =>
  pipe.transform(body, { type: 'body', metatype });

const valid = { amountMinor: 3000000, paymentDate: '2026-08-10', method: 'bank-transfer' };
const fieldsOf = (error: unknown) => Object.keys((error as ValidationError).fieldErrors ?? {});

describe('RecordPaymentDto', () => {
  it('accepts a valid payment and trims notes', async () => {
    const dto = (await validate({ ...valid, notes: ' hi ' }, RecordPaymentDto)) as RecordPaymentDto;
    expect(dto).toEqual({ ...valid, method: PaymentMethod.BANK_TRANSFER, notes: 'hi' });
  });

  it('accepts a payment without notes', async () => {
    await expect(validate(valid, RecordPaymentDto)).resolves.toBeDefined();
  });

  it.each([
    ['zero amount', { amountMinor: 0 }, 'amountMinor'],
    ['negative amount', { amountMinor: -1 }, 'amountMinor'],
    ['fractional amount', { amountMinor: 10.5 }, 'amountMinor'],
    ['unsafe amount', { amountMinor: Number.MAX_SAFE_INTEGER + 1 }, 'amountMinor'],
    ['missing amount', { amountMinor: undefined }, 'amountMinor'],
    ['missing date', { paymentDate: undefined }, 'paymentDate'],
    ['malformed date', { paymentDate: '10-08-2026' }, 'paymentDate'],
    ['date-time', { paymentDate: '2026-08-10T10:00:00Z' }, 'paymentDate'],
    ['unknown method', { method: 'crypto' }, 'method'],
    ['missing method', { method: undefined }, 'method'],
    ['long notes', { notes: 'x'.repeat(501) }, 'notes'],
  ])('rejects %s with a field-level error', async (_name, override, field) => {
    const error = await validate({ ...valid, ...override }, RecordPaymentDto).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect(fieldsOf(error)).toEqual([field]);
  });

  it('accepts a UUID v4 idempotency key', async () => {
    const idempotencyKey = '3f1c2a9e-5b7d-4c1e-9a2b-6d8e0f1a2b3c';
    await expect(validate({ ...valid, idempotencyKey }, RecordPaymentDto)).resolves.toMatchObject({
      idempotencyKey,
    });
  });

  it.each([['not-a-uuid'], [''], [42], ['3f1c2a9e-5b7d-1c1e-9a2b-6d8e0f1a2b3c']])(
    'rejects idempotency key %j',
    async (idempotencyKey) => {
      const error = await validate({ ...valid, idempotencyKey }, RecordPaymentDto).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ValidationError);
      expect(fieldsOf(error)).toEqual(['idempotencyKey']);
    },
  );

  it('rejects unknown properties', async () => {
    const error = await validate({ ...valid, status: 'voided' }, RecordPaymentDto).catch(
      (e: unknown) => e,
    );
    expect(fieldsOf(error)).toEqual(['status']);
  });
});

describe('VoidPaymentDto', () => {
  it('trims the reason', async () => {
    const dto = (await validate({ reason: '  Error  ' }, VoidPaymentDto)) as VoidPaymentDto;
    expect(dto.reason).toBe('Error');
  });

  it.each([[''], ['   '], [undefined], ['x'.repeat(501)]])('rejects reason %j', async (reason) => {
    const error = await validate({ reason }, VoidPaymentDto).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(fieldsOf(error)).toEqual(['reason']);
  });
});
