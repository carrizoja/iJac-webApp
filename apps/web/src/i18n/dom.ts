import { getLanguageSnapshot, subscribeToLanguage } from './language';
import { isTranslationKey, translate, type TranslationKey } from './translations';

const allowedAttributes = new Set(['aria-label', 'content', 'placeholder', 'title']);

function translationKey(value: string | undefined): TranslationKey | null {
  return value && isTranslationKey(value) ? value : null;
}

export function updateTranslatedDom(root: ParentNode = document) {
  const language = getLanguageSnapshot();

  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = translationKey(element.dataset.i18n);
    if (key) element.textContent = translate(language, key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((element) => {
    for (const binding of (element.dataset.i18nAttr ?? '').split(',')) {
      const separator = binding.indexOf(':');
      if (separator < 1) continue;
      const attribute = binding.slice(0, separator).trim();
      const key = translationKey(binding.slice(separator + 1).trim());
      if (allowedAttributes.has(attribute) && key) {
        element.setAttribute(attribute, translate(language, key));
      }
    }
  });

  if (typeof document !== 'undefined') document.documentElement.dataset.languageReady = 'true';
}

export function initializeDomTranslations(): () => void {
  updateTranslatedDom();
  return subscribeToLanguage(() => updateTranslatedDom());
}
