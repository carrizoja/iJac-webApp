import { describe, expect, it } from 'vitest';
import { formatMoneyInput, parseMoneyInput } from './money';

describe('parseMoneyInput', () => {
  it.each([
    ['150.000,50', 15000050],
    ['150000', 15000000],
    ['150000,5', 15000050],
    ['150.000', 15000000],
    ['1.250,50', 125050],
    ['0', 0],
    ['0,05', 5],
    ['  42,10  ', 4210],
    ['1,00', 100],
  ])('parses %s as %i minor units', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'abc',
    '-5',
    '-1,00',
    '1,234',
    '12,',
    ',50',
    '1.2.3',
    '1,2,3',
    '12.34',
    '1..000',
    '$ 100',
    '1e3',
    '99999999999999999999',
  ])('rejects %j', (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

describe('formatMoneyInput', () => {
  it('renders minor units as an editable es-AR string', () => {
    expect(formatMoneyInput(15000050)).toBe('150.000,50');
    expect(formatMoneyInput(15000000)).toBe('150.000,00');
    expect(formatMoneyInput(5)).toBe('0,05');
  });

  it('round-trips through parseMoneyInput', () => {
    expect(parseMoneyInput(formatMoneyInput(123456789))).toBe(123456789);
  });
});
