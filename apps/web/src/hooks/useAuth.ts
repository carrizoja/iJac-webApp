import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../lib/firebase';
import { type User, onAuthStateChanged, getIdToken } from 'firebase/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setLoading(true);
        try {
          const idToken = currentUser ? await getIdToken(currentUser, true) : null;
          setToken(idToken);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to get token'));
          setToken(null);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { user, token, loading, error };
}
