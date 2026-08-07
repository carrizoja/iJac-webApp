import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useAuth and Firebase before importing AppShell
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

import { AppShell } from './AppShell';
import * as useAuthModule from '../../hooks/useAuth';
import * as FirebaseAuth from 'firebase/auth';

describe('AppShell', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      token: 'id-token-123',
      loading: false,
      error: null,
    });
  });

  it('renders the iJac logo and brand name', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const logo = screen.getByText('iJac');
    expect(logo).toBeInTheDocument();
  });

  it('displays all navigation links on desktop', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Navigation links appear in both desktop and mobile navs, so we use getAllByText
    const inicioLinks = screen.getAllByText('Inicio');
    expect(inicioLinks.length).toBeGreaterThan(0);
    
    const clientesLinks = screen.getAllByText('Clientes');
    expect(clientesLinks.length).toBeGreaterThan(0);
    
    const ordenesLinks = screen.getAllByText('Órdenes');
    expect(ordenesLinks.length).toBeGreaterThan(0);
    
    const calendarioLinks = screen.getAllByText('Calendario');
    expect(calendarioLinks.length).toBeGreaterThan(0);
  });

  it('displays the user email on desktop', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const email = screen.getByText('test@example.com');
    expect(email).toBeInTheDocument();
  });

  it('renders children content in main area', () => {
    render(
      <AppShell>
        <div>My Custom Content</div>
      </AppShell>
    );

    expect(screen.getByText('My Custom Content')).toBeInTheDocument();
  });

  it('calls signOut when sign-out button is clicked', async () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const signOutButton = screen.getByText('Salir');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(FirebaseAuth.signOut).toHaveBeenCalled();
    });
  });

  it('handles missing user email gracefully', () => {
    const userWithoutEmail = { uid: 'user123' } as any;
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: userWithoutEmail,
      token: 'id-token-123',
      loading: false,
      error: null,
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Should not crash and email field should be empty or have some default
    const container = screen.getByText('Salir').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('provides accessible aria-label for navigation', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const navs = screen.getAllByLabelText('Navegación principal');
    expect(navs.length).toBeGreaterThan(0);
  });

  it('navigation links have focus-visible styling hooks', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Get navigation links (not the logo link)
    const navLinks = container.querySelectorAll('nav a[href="/"]');
    expect(navLinks.length).toBeGreaterThan(0);
    // Check that focus-visible class is present on nav links
    expect(navLinks[0].className).toMatch(/focus-visible/);
  });
});
