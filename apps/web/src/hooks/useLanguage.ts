import { useSyncExternalStore } from 'react';
import {
  getLanguageSnapshot,
  getServerLanguageSnapshot,
  setLanguage,
  subscribeToLanguage,
} from '../i18n/language';
import { translate, type Language, type TranslationKey } from '../i18n/translations';

export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  return {
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'es' ? 'en' : 'es'),
    t: (key: TranslationKey, parameters?: Record<string, string | number>) =>
      translate(language, key, parameters),
  } satisfies {
    language: Language;
    setLanguage: typeof setLanguage;
    toggleLanguage: () => void;
    t: (key: TranslationKey, parameters?: Record<string, string | number>) => string;
  };
}
