import { getFirebaseAuth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Button, Alert } from '../ui';
import { LanguageToggle } from '../layout/LanguageToggle';
import { useLanguage } from '../../hooks/useLanguage';

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" role="img">
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 21.67c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.67Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.76a5.85 5.85 0 0 1 0-3.52V7.71H3.3a9.76 9.76 0 0 0 0 8.58l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.21c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.27 14.63 2.33 12 2.33a9.74 9.74 0 0 0-8.7 5.38l3.24 2.53C7.31 7.93 9.46 6.21 12 6.21Z"
      />
    </svg>
  );
}

export function SignIn() {
  const { t } = useLanguage();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (error) {
      console.error('Sign in failed', error);
      setErrorMessage(t('signin.error'));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main
      className="relative isolate flex min-h-screen flex-col overflow-hidden bg-bg-primary px-4 py-8 text-fg-primary sm:px-6 lg:py-12"
      data-testid="sign-in-page"
    >
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageToggle />
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="login-orb login-orb-cyan" />
        <div className="login-orb login-orb-purple" />
      </div>

      <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <div className="login-reveal mx-auto w-full max-w-sm text-center">
          <a
            href="/"
            className="inline-flex rounded-xl p-2 transition-opacity hover:opacity-80"
            aria-label={t('signin.home')}
          >
            <img
              src="/ijac/logo.png"
              alt="iJac IT Solutions"
              className="h-14 w-auto object-contain"
            />
          </a>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-accent-light">
            {t('signin.eyebrow')}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-fg-primary sm:text-4xl">
            {t('signin.title')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-fg-secondary">{t('signin.description')}</p>

          <div className="glass-surface login-panel mt-8 rounded-2xl p-5 text-left sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-fg-primary">{t('signin.panelTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-fg-tertiary">
                {t('signin.panelDescription')}
              </p>
            </div>

            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              isLoading={isSigningIn}
              variant="primary"
              size="xl"
              className="min-h-12 w-full rounded-xl shadow-glow-cyan"
              startIcon={<GoogleMark />}
            >
              {isSigningIn ? t('signin.connecting') : t('signin.continueGoogle')}
            </Button>

            <div className="mt-5 flex items-center gap-3 text-[11px] text-fg-tertiary">
              <span className="h-px flex-1 bg-border-subtle" />
              <span>{t('signin.protected')}</span>
              <span className="h-px flex-1 bg-border-subtle" />
            </div>

            {errorMessage && (
              <Alert type="error" icon="!" onClose={() => setErrorMessage(null)} className="mt-5">
                {errorMessage}
              </Alert>
            )}
          </div>

          <p className="mt-6 text-xs text-fg-tertiary">{t('signin.authorization')}</p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 border-t border-border-subtle/60 pt-5 text-xs text-fg-tertiary">
        <span className="font-brand text-sm text-fg-secondary">iJac</span>
        <span>{t('signin.location')}</span>
      </footer>
    </main>
  );
}
