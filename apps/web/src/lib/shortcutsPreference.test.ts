import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readShortcutsEnabled, storeShortcutsEnabled } from './shortcutsPreference';

describe('shortcuts preference', () => {
  beforeEach(() => window.localStorage.clear());

  it('is on until turned off, and remembers the choice', () => {
    expect(readShortcutsEnabled()).toBe(true);
    storeShortcutsEnabled(false);
    expect(readShortcutsEnabled()).toBe(false);
    storeShortcutsEnabled(true);
    expect(readShortcutsEnabled()).toBe(true);
  });

  it('stays on when storage cannot be read', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readShortcutsEnabled()).toBe(true);
    spy.mockRestore();
  });

  it('does not throw when storage cannot be written', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storeShortcutsEnabled(false)).not.toThrow();
    spy.mockRestore();
  });
});
