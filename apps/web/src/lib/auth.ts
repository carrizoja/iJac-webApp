import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

export async function getCurrentToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user, true);
  } catch {
    return null;
  }
}
