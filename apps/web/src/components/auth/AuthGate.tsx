import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { SignIn } from './SignIn';
import { AppShell } from './AppShell';

export function AuthGate() {
  const [user, setUser] = useState<ReturnType<typeof onAuthStateChanged> extends (a: never, cb: infer C) => unknown ? C extends (user: infer U) => unknown ? U : never : never>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <AppShell user={user} />;
}
