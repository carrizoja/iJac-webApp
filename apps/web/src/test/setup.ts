import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { LANGUAGE_STORAGE_KEY, setLanguage } from '../i18n/language';

// Minimal browser API stubs for React and Firebase under happy-dom.
(
  globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }
).requestAnimationFrame = (fn: FrameRequestCallback) => setTimeout(fn, 0);

afterEach(() => {
  setLanguage('es');
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  document.documentElement.lang = 'es';
});
