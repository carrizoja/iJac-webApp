import { getFirebaseAuth } from './firebase';
import { getIdToken } from 'firebase/auth';

export async function getCurrentToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user, true);
  } catch {
    return null;
  }
}
