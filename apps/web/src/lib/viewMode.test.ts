import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY, readViewMode, storeViewMode } from './viewMode';

const KEY = 'test.viewMode';

function stubPhone(isPhone: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: isPhone && query === PHONE_QUERY }) as MediaQueryList,
  );
}

describe('viewMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('opens with the view chosen on the last visit', () => {
    stubPhone(true);
    storeViewMode(KEY, 'table');
    expect(readViewMode(KEY)).toBe('table');
    stubPhone(false);
    storeViewMode(KEY, 'cards');
    expect(readViewMode(KEY)).toBe('cards');
  });

  it('opens in cards on a phone and as a table on wider screens when nothing was chosen', () => {
    stubPhone(true);
    expect(readViewMode(KEY)).toBe('cards');
    stubPhone(false);
    expect(readViewMode(KEY)).toBe('table');
  });

  it('ignores a stored value that is not a view', () => {
    stubPhone(false);
    window.localStorage.setItem(KEY, 'grid');
    expect(readViewMode(KEY)).toBe('table');
  });

  it('still opens when storage is unavailable', () => {
    stubPhone(true);
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storeViewMode(KEY, 'table')).not.toThrow();
    expect(readViewMode(KEY)).toBe('cards');
  });

  it('falls back to the table where there is no window, as in server rendering', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(readViewMode(KEY)).toBe('table');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
