import { CredentialEncryption } from './credential-encryption';
import { randomBytes } from 'crypto';

describe('CredentialEncryption', () => {
  const key = randomBytes(32).toString('base64');

  it('encrypts and decrypts a refresh token', () => {
    const encryption = new CredentialEncryption(key);
    const plaintext = 'super-secret-refresh-token';
    const encrypted = encryption.encrypt(plaintext);
    expect(encrypted.encrypted).not.toBe(plaintext);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.version).toBe(1);
    const decrypted = encryption.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('rejects a wrong-length key', () => {
    expect(() => new CredentialEncryption(Buffer.alloc(16).toString('base64'))).toThrow(
      'Credential encryption key must be 32 bytes',
    );
  });

  it('fails to decrypt tampered ciphertext', () => {
    const encryption = new CredentialEncryption(key);
    const encrypted = encryption.encrypt('token');
    encrypted.encrypted = Buffer.from('tampered').toString('base64');
    expect(() => encryption.decrypt(encrypted)).toThrow();
  });

  it('fails to decrypt with unsupported version', () => {
    const encryption = new CredentialEncryption(key);
    const encrypted = encryption.encrypt('token');
    encrypted.version = 99;
    expect(() => encryption.decrypt(encrypted)).toThrow('Unsupported credential encryption version');
  });
});
