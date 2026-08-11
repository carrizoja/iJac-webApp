import type { Language } from './translations';

export const LANGUAGE_STORAGE_KEY = 'ijac-language';
export const LANGUAGE_CHANGE_EVENT = 'ijac-language-change';

export function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en';
}

function documentLanguage(): Language {
  if (typeof document === 'undefined') return 'es';
  return isLanguage(document.documentElement.lang) ? document.documentElement.lang : 'es';
}

let currentLanguage: Language = documentLanguage();

function applyLanguage(language: Language) {
  currentLanguage = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export function getLanguageSnapshot(): Language {
  return currentLanguage;
}

export function getServerLanguageSnapshot(): Language {
  return 'es';
}

export function setLanguage(language: Language) {
  applyLanguage(language);

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The current page still switches when persistence is unavailable.
  }
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: language }));
}

export function subscribeToLanguage(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleLanguageChange = (event: Event) => {
    const language = (event as CustomEvent<unknown>).detail;
    if (!isLanguage(language)) return;
    applyLanguage(language);
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LANGUAGE_STORAGE_KEY) return;
    const language = event.newValue === null ? 'es' : event.newValue;
    if (!isLanguage(language)) return;
    applyLanguage(language);
    onStoreChange();
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.removeEventListener('storage', handleStorage);
  };
}
