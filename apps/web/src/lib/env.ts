import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class WebEnvironment {
  @IsString()
  @IsNotEmpty()
  PUBLIC_FIREBASE_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_FIREBASE_AUTH_DOMAIN!: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_FIREBASE_PROJECT_ID!: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_FIREBASE_APP_ID!: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_API_URL!: string;
}

export function validateWebEnvironment(raw: Record<string, unknown>): WebEnvironment {
  const env = new WebEnvironment();
  env.PUBLIC_FIREBASE_API_KEY = String(raw.PUBLIC_FIREBASE_API_KEY ?? '');
  env.PUBLIC_FIREBASE_AUTH_DOMAIN = String(raw.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '');
  env.PUBLIC_FIREBASE_PROJECT_ID = String(raw.PUBLIC_FIREBASE_PROJECT_ID ?? '');
  env.PUBLIC_FIREBASE_APP_ID = String(raw.PUBLIC_FIREBASE_APP_ID ?? '');
  env.PUBLIC_API_URL = String(raw.PUBLIC_API_URL ?? '');

  const errors: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value || value === 'undefined') {
      errors.push(`${key} is required`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Invalid web environment: ${errors.join(', ')}`);
  }

  return env;
}

export type SafeEnv = {
  PUBLIC_FIREBASE_API_KEY: string;
  PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  PUBLIC_FIREBASE_PROJECT_ID: string;
  PUBLIC_FIREBASE_APP_ID: string;
  PUBLIC_API_URL: string;
};

export function getPublicEnv(): SafeEnv {
  return {
    PUBLIC_FIREBASE_API_KEY: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_AUTH_DOMAIN: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_FIREBASE_APP_ID: import.meta.env.PUBLIC_FIREBASE_APP_ID,
    PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
  };
}
