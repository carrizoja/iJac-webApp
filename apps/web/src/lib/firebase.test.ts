import { describe, expect, it, vi } from 'vitest';

const { app, auth, getApp, getApps, initializeApp, getAuth } = vi.hoisted(() => ({
  app: { name: 'test-app' },
  auth: { name: 'test-auth' },
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('firebase/app', () => ({ getApp, getApps, initializeApp }));
vi.mock('firebase/auth', () => ({ getAuth }));

import { getFirebaseAuth } from './firebase';

describe('getFirebaseAuth', () => {
  it('defers Firebase app and Auth initialization until requested in the browser', () => {
    expect(initializeApp).not.toHaveBeenCalled();
    expect(getAuth).not.toHaveBeenCalled();

    initializeApp.mockReturnValue(app);
    getAuth.mockReturnValue(auth);

    expect(getFirebaseAuth()).toBe(auth);
    expect(initializeApp).toHaveBeenCalledOnce();
    expect(getAuth).toHaveBeenCalledWith(app);
  });
});
