import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';

interface NavLink {
  href: string;
  labelKey: TranslationKey;
}

const navLinks: NavLink[] = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/clients', labelKey: 'nav.clients' },
  { href: '/work-orders', labelKey: 'nav.workOrders' },
  { href: '/calendar', labelKey: 'nav.calendar' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen">
      <header className="app-shell-header px-4 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="navbar-surface rounded-2xl border px-3 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <a
                  href="/"
                  className="navbar-brand-control inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors"
                  aria-label={t('nav.goHome')}
                >
                  <img src="/ijac/logo.png" alt="iJac" className="h-7 w-7 object-contain" />
                  <span className="sr-only">iJac</span>
                </a>
                <nav
                  className="hidden items-center gap-1 text-sm sm:flex"
                  aria-label={t('nav.primary')}
                >
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="navbar-link rounded-lg px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {t(link.labelKey)}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden max-w-[14rem] truncate text-xs text-fg-tertiary lg:inline">
                  {user?.email}
                </span>
                <ThemeToggle />
                <LanguageToggle />
                <button
                  type="button"
                  onClick={() => signOut(getFirebaseAuth())}
                  className="navbar-control rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {t('nav.signOut')}
                </button>
                <button
                  ref={mobileMenuButtonRef}
                  type="button"
                  className="navbar-control inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus sm:hidden"
                  aria-label={mobileMenuOpen ? t('nav.close') : t('nav.open')}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-primary-navigation"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    {mobileMenuOpen ? (
                      <path d="M6 6l12 12M18 6 6 18" />
                    ) : (
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {mobileMenuOpen ? (
              <nav
                id="mobile-primary-navigation"
                className="mt-2 grid gap-1 border-t border-border-default pt-2 text-sm sm:hidden"
                aria-label={t('nav.primaryMobile')}
              >
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="navbar-link flex min-h-11 items-center rounded-lg px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t(link.labelKey)}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </header>
      <main className="app-shell-main mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
