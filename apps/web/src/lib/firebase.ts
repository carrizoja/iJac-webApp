import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
} from 'astro:env/client';

const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser');
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
}
