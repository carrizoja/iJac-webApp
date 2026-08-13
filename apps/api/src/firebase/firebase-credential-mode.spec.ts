import { selectFirebaseCredentialMode } from './firebase-credential-mode';

describe('selectFirebaseCredentialMode', () => {
  it('selects Application Default Credentials when explicit credentials are absent', () => {
    expect(selectFirebaseCredentialMode({})).toEqual({
      mode: 'application-default',
    });
  });

  it('selects and normalizes explicit credentials for local use', () => {
    expect(
      selectFirebaseCredentialMode({
        FIREBASE_CLIENT_EMAIL: 'local@example.com',
        FIREBASE_PRIVATE_KEY: 'line-one\\nline-two',
      }),
    ).toEqual({
      mode: 'explicit',
      clientEmail: 'local@example.com',
      privateKey: 'line-one\nline-two',
    });
  });
});
