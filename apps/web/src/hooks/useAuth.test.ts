import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Firebase before importing useAuth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  getIdToken: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({})),
}));

import { useAuth } from './useAuth';
import * as FirebaseAuth from 'firebase/auth';

describe('useAuth', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let mockOnAuthStateChanged: ReturnType<typeof vi.fn>;
  let mockGetIdToken: ReturnType<typeof vi.fn>;
  let callbackStore: { callback?: any; errorCallback?: any };

  beforeEach(() => {
    callbackStore = {};
    mockUnsubscribe = vi.fn();
    mockOnAuthStateChanged = vi.fn((_auth, callback, errorCallback) => {
      callbackStore.callback = callback;
      callbackStore.errorCallback = errorCallback;
      return mockUnsubscribe;
    });
    mockGetIdToken = vi.fn();

    vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(mockOnAuthStateChanged);
    vi.mocked(FirebaseAuth.getIdToken).mockImplementation(mockGetIdToken);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('transitions to signed-out state when no user is authenticated', async () => {
    const { result } = renderHook(() => useAuth());

    // Simulate auth state change: no user
    callbackStore.callback?.(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('transitions to signed-in state and fetches the ID token', async () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    mockGetIdToken.mockResolvedValue('id-token-123');

    const { result } = renderHook(() => useAuth());

    // Simulate auth state change: user signed in
    callbackStore.callback?.(mockUser);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.token).toBe('id-token-123');
    expect(result.current.error).toBe(null);
  });

  it('sets an error when token refresh fails', async () => {
    const mockUser = { uid: 'user123' };
    const tokenError = new Error('Token refresh failed');
    mockGetIdToken.mockRejectedValue(tokenError);

    const { result } = renderHook(() => useAuth());

    // Simulate auth state change: user signed in but token fetch fails
    callbackStore.callback?.(mockUser);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.token).toBe(null);
    expect(result.current.error).toEqual(tokenError);
  });

  it('handles non-Error token refresh failures gracefully', async () => {
    const mockUser = { uid: 'user123' };
    mockGetIdToken.mockRejectedValue('unknown error');

    const { result } = renderHook(() => useAuth());

    callbackStore.callback?.(mockUser);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(mockUser);
    expect(result.current.token).toBe(null);
    expect(result.current.error?.message).toBe('Failed to get token');
  });

  it('sets an error when onAuthStateChanged fails', async () => {
    const { result } = renderHook(() => useAuth());

    const authError = new Error('Auth listener failed');
    callbackStore.errorCallback?.(authError);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(authError);
  });

  it('unsubscribes from auth state changes on unmount', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
