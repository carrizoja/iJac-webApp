import { useAuth } from '../hooks/useAuth';
import { SignIn } from './SignIn';

interface ProtectedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Protected({ children, fallback }: ProtectedProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return fallback ? <>{fallback}</> : <SignIn />;
  }

  return <>{children}</>;
}
