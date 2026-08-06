import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';

export function SignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sign in failed', error);
      setErrorMessage(
        'No se pudo iniciar sesión. Verifica la configuración de Firebase e inténtalo de nuevo.',
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">iJac Operaciones</h1>
        <p className="mt-2 text-slate-400">Gestión interna de clientes y órdenes de trabajo</p>
      </div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        {isSigningIn ? 'Iniciando sesión…' : 'Iniciar sesión con Google'}
      </button>
      {errorMessage && (
        <p role="alert" className="max-w-md text-center text-sm text-red-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
