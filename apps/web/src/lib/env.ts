/**
 * Browser-safe environment validation without server-only dependencies.
 * Validates public environment variables are available and non-empty at runtime.
 */

export class WebEnvironment {
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_API_URL: string;

  constructor(raw: Record<string, unknown>) {
    const fb_key = String(raw.PUBLIC_FIREBASE_API_KEY ?? '');
    const fb_domain = String(raw.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '');
    const fb_project = String(raw.PUBLIC_FIREBASE_PROJECT_ID ?? '');
    const fb_app_id = String(raw.PUBLIC_FIREBASE_APP_ID ?? '');
    const api_url = String(raw.PUBLIC_API_URL ?? '');

    const errors: string[] = [];
    if (!fb_key || fb_key === 'undefined') errors.push('PUBLIC_FIREBASE_API_KEY is required');
    if (!fb_domain || fb_domain === 'undefined') errors.push('PUBLIC_FIREBASE_AUTH_DOMAIN is required');
    if (!fb_project || fb_project === 'undefined') errors.push('PUBLIC_FIREBASE_PROJECT_ID is required');
    if (!fb_app_id || fb_app_id === 'undefined') errors.push('PUBLIC_FIREBASE_APP_ID is required');
    if (!api_url || api_url === 'undefined') errors.push('PUBLIC_API_URL is required');

    if (errors.length > 0) {
      throw new Error(`Invalid web environment: ${errors.join(', ')}`);
    }

    this.PUBLIC_FIREBASE_API_KEY = fb_key;
    this.PUBLIC_FIREBASE_AUTH_DOMAIN = fb_domain;
    this.PUBLIC_FIREBASE_PROJECT_ID = fb_project;
    this.PUBLIC_FIREBASE_APP_ID = fb_app_id;
    this.PUBLIC_API_URL = api_url;
  }
}

export type SafeEnv = {
  PUBLIC_FIREBASE_API_KEY: string;
  PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  PUBLIC_FIREBASE_PROJECT_ID: string;
  PUBLIC_FIREBASE_APP_ID: string;
  PUBLIC_API_URL: string;
};

/**
 * Safely retrieve public environment variables.
 * Throws if any required variable is missing or invalid.
 */
export function getPublicEnv(): SafeEnv {
  const env = new WebEnvironment({
    PUBLIC_FIREBASE_API_KEY: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_AUTH_DOMAIN: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_FIREBASE_APP_ID: import.meta.env.PUBLIC_FIREBASE_APP_ID,
    PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
  });

  return {
    PUBLIC_FIREBASE_API_KEY: env.PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_AUTH_DOMAIN: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID: env.PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_FIREBASE_APP_ID: env.PUBLIC_FIREBASE_APP_ID,
    PUBLIC_API_URL: env.PUBLIC_API_URL,
  };
}
