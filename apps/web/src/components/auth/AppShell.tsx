import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface AppShellProps {
  user: import('firebase/auth').User;
}

export function AppShell({ user }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-100">iJac</span>
            <nav className="hidden gap-3 text-sm sm:flex">
              <a href="/" className="text-slate-300 hover:text-slate-100">
                Inicio
              </a>
              <a href="/clients" className="text-slate-300 hover:text-slate-100">
                Clientes
              </a>
              <a href="/work-orders" className="text-slate-300 hover:text-slate-100">
                Órdenes
              </a>
              <a href="/calendar" className="text-slate-300 hover:text-slate-100">
                Calendario
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 md:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <p className="text-slate-400">Bienvenido al sistema interno de iJac.</p>
      </main>
    </div>
  );
}
