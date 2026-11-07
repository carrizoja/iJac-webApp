import { describe, expect, it } from 'vitest';
import { matchesOrderSearch } from './workOrderSearch';

const order = { title: 'Reparación de notebook', clientName: 'José Pérez' };

describe('matchesOrderSearch', () => {
  it('matches the title or the client name, ignoring accents and case', () => {
    expect(matchesOrderSearch(order, 'perez')).toBe(true);
    expect(matchesOrderSearch(order, 'REPARACION')).toBe(true);
    expect(matchesOrderSearch(order, 'josé pé')).toBe(true);
    expect(matchesOrderSearch(order, 'servidor')).toBe(false);
  });

  it('matches every order when the search is empty or only spaces', () => {
    expect(matchesOrderSearch(order, '')).toBe(true);
    expect(matchesOrderSearch(order, '   ')).toBe(true);
  });
});
