import * as Joi from 'joi';

export interface ApiEnvironment {
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  WEB_APP_URL: string;
  ALLOWED_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FIRESTORE_EMULATOR_HOST?: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  CREDENTIAL_ENCRYPTION_KEY: string;
  REPOSITORY_MODE: 'global' | 'organization';
  DEFAULT_ORGANIZATION_ID?: string;
}

export const apiEnvironmentSchema = Joi.object<ApiEnvironment>({
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: Joi.string().uri().required(),
  WEB_APP_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  ALLOWED_DOMAIN: Joi.string().allow('').default(''),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIRESTORE_EMULATOR_HOST: Joi.string().optional(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_REDIRECT_URI: Joi.string().uri().required(),
  CREDENTIAL_ENCRYPTION_KEY: Joi.string().required(),
  REPOSITORY_MODE: Joi.string().valid('global', 'organization').default('global'),
  DEFAULT_ORGANIZATION_ID: Joi.string().optional(),
}).unknown();

export function validateApiEnvironment(raw: Record<string, unknown>): ApiEnvironment {
  const { error, value } = apiEnvironmentSchema.validate(raw, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error) {
    throw new Error(`Invalid API environment: ${error.message}`);
  }
  return value as ApiEnvironment;
}
