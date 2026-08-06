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

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href="/" className="font-semibold text-slate-100">
              iJac
            </a>
            <nav className="hidden gap-3 text-sm sm:flex" aria-label="Navegación principal">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 md:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-2 text-sm sm:hidden" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
