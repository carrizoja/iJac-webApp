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
      aria-label={label}
      title={label}
      onClick={toggleLanguage}
    >
      <span lang={language}>{language.toUpperCase()}</span>
    </button>
  );
}
