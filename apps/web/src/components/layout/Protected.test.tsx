import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock useAuth before importing Protected
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../auth/SignIn', () => ({
  SignIn: () => <div>Sign In Component</div>,
}));

import { Protected } from './Protected';
import * as useAuthModule from '../../hooks/useAuth';

describe('Protected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when loading is true', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: true,
      error: null,
    });

    render(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows SignIn component when user is not authenticated', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
    });

    render(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign In Component')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', async () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' } as any;
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      token: 'id-token-123',
      loading: false,
      error: null,
    });

    render(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sign In Component')).not.toBeInTheDocument();
  });

  it('respects loading state transitions from loading to signed-in', async () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' } as any;
    const { rerender } = render(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    // Initially loading
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: true,
      error: null,
    });

    rerender(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    // Transition to signed-in
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      token: 'id-token-123',
      loading: false,
      error: null,
    });

    rerender(
      <Protected>
        <div>Protected Content</div>
      </Protected>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
