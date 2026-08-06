export interface OAuthTransaction {
  nonce: string;
  uid: string;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: Date;
}

export interface OAuthTransactionRepository {
  create(transaction: OAuthTransaction): Promise<void>;
  findAndDelete(nonce: string): Promise<OAuthTransaction | null>;
}
