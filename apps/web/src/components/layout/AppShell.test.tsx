import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Mock useAuth and Firebase before importing AppShell
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

import { AppShell } from './AppShell';
import * as useAuthModule from '../../hooks/useAuth';
import * as FirebaseAuth from 'firebase/auth';
import { setLanguage } from '../../i18n/language';

describe('AppShell', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    setLanguage('es');
    document.documentElement.className = 'dark';
    document.documentElement.style.colorScheme = 'dark';
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
      </AppShell>,
    );

    const logo = screen.getByText('iJac');
    expect(logo).toBeInTheDocument();
  });

  it('displays all navigation links on desktop', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const desktopNavigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(desktopNavigation).getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Clientes' })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Órdenes' })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Calendario' })).toBeInTheDocument();
  });

  it('starts with accessible mobile navigation collapsed', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const trigger = screen.getByRole('button', { name: 'Abrir navegación principal' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-primary-navigation');
    expect(trigger.className).toMatch(/h-11/);
    expect(trigger.className).toMatch(/w-11/);
    expect(trigger.className).toMatch(/focus-visible/);
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal móvil' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the theme toggle in the visible navbar controls outside the mobile menu', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const themeToggle = screen.getByRole('button', { name: 'Cambiar a tema claro' });
    const mobileMenu = screen.queryByRole('navigation', { name: 'Navegación principal móvil' });

    expect(themeToggle.closest('header')).toBeInTheDocument();
    expect(themeToggle).toHaveClass('h-11', 'w-11');
    expect(mobileMenu).not.toBeInTheDocument();
  });

  it('switches all navbar copy to English from the always-visible language control', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a inglés' }));

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Spanish' })).toBeInTheDocument();
  });

  it('opens and closes the mobile navigation from its trigger', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación principal' }));

    const trigger = screen.getByRole('button', { name: 'Cerrar navegación principal' });
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(mobileNavigation).toHaveAttribute('id', 'mobile-primary-navigation');

    for (const label of ['Inicio', 'Clientes', 'Órdenes', 'Calendario']) {
      const link = within(mobileNavigation).getByRole('link', { name: label });
      expect(link).toBeInTheDocument();
      expect(link.className).toMatch(/min-h-11/);
      expect(link.className).toMatch(/focus-visible/);
    }

    fireEvent.click(trigger);
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal móvil' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir navegación principal' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile navigation after a destination is selected', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación principal' }));
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' });
    fireEvent.click(within(mobileNavigation).getByRole('link', { name: 'Clientes' }));

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal móvil' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir navegación principal' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the mobile navigation on Escape and restores trigger focus', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación principal' }));
    const trigger = screen.getByRole('button', { name: 'Cerrar navegación principal' });
    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' });
    within(mobileNavigation).getByRole('link', { name: 'Inicio' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal móvil' }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('displays the user email on desktop', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const email = screen.getByText('test@example.com');
    expect(email).toBeInTheDocument();
  });

  it('renders children content in main area', () => {
    render(
      <AppShell>
        <div>My Custom Content</div>
      </AppShell>,
    );

    expect(screen.getByText('My Custom Content')).toBeInTheDocument();
  });

  it('calls signOut when sign-out button is clicked', async () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
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
      </AppShell>,
    );

    // Should not crash and email field should be empty or have some default
    const container = screen.getByText('Salir').parentElement;
    expect(container).toBeInTheDocument();
  });

  it('provides accessible aria-label for navigation', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByLabelText('Navegación principal')).toBeInTheDocument();
  });

  it('navigation links have focus-visible styling hooks', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    // Get navigation links (not the logo link)
    const navLinks = container.querySelectorAll('nav a[href="/"]');
    expect(navLinks.length).toBeGreaterThan(0);
    // Check that focus-visible class is present on nav links
    expect(navLinks[0].className).toMatch(/focus-visible/);
  });
});
