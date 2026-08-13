import type { ApiEnvironment } from '../config/env';

type FirebaseCredentialEnvironment = Pick<
  ApiEnvironment,
  'FIREBASE_CLIENT_EMAIL' | 'FIREBASE_PRIVATE_KEY'
>;

export type FirebaseCredentialMode =
  { mode: 'application-default' } | { mode: 'explicit'; clientEmail: string; privateKey: string };

export function selectFirebaseCredentialMode(
  environment: FirebaseCredentialEnvironment,
): FirebaseCredentialMode {
  const clientEmail = environment.FIREBASE_CLIENT_EMAIL;
  const privateKey = environment.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return {
      mode: 'explicit',
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return { mode: 'application-default' };
}
