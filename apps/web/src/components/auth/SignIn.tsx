import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Button, Alert, LoadingState } from '../ui';

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

  if (isSigningIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <LoadingState
          variant="spinner"
          message="Iniciando sesión..."
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-fg-primary">
          iJac Operaciones
        </h1>
        <p className="mt-2 text-fg-secondary">
          Gestión interna de clientes y órdenes de trabajo
        </p>
      </div>

      <Button
        onClick={handleSignIn}
        disabled={isSigningIn}
        variant="primary"
        size="lg"
      >
        {isSigningIn ? 'Iniciando sesión…' : 'Iniciar sesión con Google'}
      </Button>

      {errorMessage && (
        <Alert
          type="error"
          icon="⚠️"
          onClose={() => setErrorMessage(null)}
          className="max-w-md"
        >
          {errorMessage}
        </Alert>
      )}
    </div>
  );
}
