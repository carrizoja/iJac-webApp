import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Inicio' },
  { href: '/clients', label: 'Clientes' },
  { href: '/work-orders', label: 'Órdenes' },
  { href: '/calendar', label: 'Calendario' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
      <header className="px-4 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-white/12 bg-[#1a1a1a] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <a
                  href="/"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#111111] transition-colors hover:bg-[#151515]"
                  aria-label="Ir al inicio"
                >
                  <img src="/ijac/logo.png" alt="iJac" className="h-7 w-7 object-contain" />
                  <span className="sr-only">iJac</span>
                </a>
                <nav className="hidden items-center gap-1 text-sm sm:flex" aria-label="Navegación principal">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="rounded-lg px-3 py-2 text-fg-secondary transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden max-w-[14rem] truncate text-xs text-fg-tertiary lg:inline">{user?.email}</span>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  Salir
                </button>
                <button
                  ref={mobileMenuButtonRef}
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-fg-secondary transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus sm:hidden"
                  aria-label={mobileMenuOpen ? 'Cerrar navegación principal' : 'Abrir navegación principal'}
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
                className="mt-2 grid gap-1 border-t border-white/10 pt-2 text-sm sm:hidden"
                aria-label="Navegación principal móvil"
              >
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-fg-secondary transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
