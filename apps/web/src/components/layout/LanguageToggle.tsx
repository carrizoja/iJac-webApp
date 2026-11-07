import { useLanguage } from '../../hooks/useLanguage';

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();
  const targetLanguage = language === 'es' ? 'en' : 'es';
  const label = t(
    targetLanguage === 'en' ? 'language.switchToEnglish' : 'language.switchToSpanish',
  );

  return (
    <button
      type="button"
      className="navbar-control inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-semibold tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      // The accessible name starts with the visible code, which voice control users say.
      aria-label={`${language.toUpperCase()}: ${label}`}
      title={label}
      onClick={toggleLanguage}
    >
      <span lang={language}>{language.toUpperCase()}</span>
    </button>
  );
}
