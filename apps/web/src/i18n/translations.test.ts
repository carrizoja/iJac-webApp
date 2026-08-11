import { describe, expect, it } from 'vitest';
import { en, es, translate } from './translations';

describe('translations', () => {
  it('keeps exact dictionary parity', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('interpolates named parameters in both languages', () => {
    expect(translate('es', 'clients.editNamed', { name: 'Acme' })).toBe('Editar Acme');
    expect(translate('en', 'clients.editNamed', { name: 'Acme' })).toBe('Edit Acme');
  });
});
