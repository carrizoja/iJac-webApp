import { OAuth2Client } from 'google-auth-library';

export const CALENDAR_CONNECTION_REPOSITORY = Symbol('CALENDAR_CONNECTION_REPOSITORY');
export const CALENDAR_EVENT_MAPPING_REPOSITORY = Symbol('CALENDAR_EVENT_MAPPING_REPOSITORY');
export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export type GoogleOAuthClient = OAuth2Client;
