import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  getLanguageSnapshot,
  isLanguage,
  setLanguage,
  subscribeToLanguage,
} from './language';

describe('language store', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setLanguage('es');
    window.localStorage.clear();
  });

  it('accepts only exact supported language values', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('EN')).toBe(false);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it('updates the snapshot, HTML language, storage, and custom event', () => {
    const listener = vi.fn();
    window.addEventListener(LANGUAGE_CHANGE_EVENT, listener);

    setLanguage('en');

    expect(getLanguageSnapshot()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('switches the current page when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    setLanguage('en');

    expect(getLanguageSnapshot()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('notifies subscribers for valid custom and cross-tab storage events only', () => {
    const subscriber = vi.fn();
    const unsubscribe = subscribeToLanguage(subscriber);

    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: 'en' }));
    expect(getLanguageSnapshot()).toBe('en');
    expect(subscriber).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'es' }),
    );
    expect(getLanguageSnapshot()).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(subscriber).toHaveBeenCalledTimes(2);

    window.dispatchEvent(
      new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: null }),
    );
    expect(getLanguageSnapshot()).toBe('es');
    expect(subscriber).toHaveBeenCalledTimes(3);

    window.dispatchEvent(
      new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'fr' }),
    );
    expect(subscriber).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
