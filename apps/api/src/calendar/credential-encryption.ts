import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedCredential {
  encrypted: string;
  iv: string;
  tag: string;
  version: number;
}

export class CredentialEncryption {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    const decoded = Buffer.from(base64Key, 'base64');
    if (decoded.length !== 32) {
      throw new Error('Credential encryption key must be 32 bytes');
    }
    this.key = decoded;
  }

  encrypt(plaintext: string): EncryptedCredential {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      version: 1,
    };
  }

  decrypt(credential: EncryptedCredential): string {
    if (credential.version !== 1) {
      throw new Error(`Unsupported credential encryption version: ${credential.version}`);
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(credential.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(credential.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(credential.encrypted, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
