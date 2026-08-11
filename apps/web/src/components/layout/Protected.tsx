import { useAuth } from '../../hooks/useAuth';
import { SignIn } from '../auth/SignIn';
import { LoadingState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';

interface ProtectedProps {
  children: React.ReactNode;
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState variant="spinner" message={t('protected.loading')} size="md" />
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return <>{children}</>;
}
