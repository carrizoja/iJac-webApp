import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { signInWithPopup, addScope } = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  addScope: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({ auth: { name: 'test-auth' } }));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(() => ({ addScope })),
  signInWithPopup,
}));

import { SignIn } from './SignIn';

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the branded access composition with one supported sign-in action', () => {
    render(<SignIn />);

    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ingresar a iJac' })).toBeInTheDocument();
    expect(screen.getByText('Acceso al panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar a inglés' })).toBeInTheDocument();
  });

  it('switches the complete signed-out experience to English', () => {
    render(<SignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a inglés' }));
    expect(screen.getByRole('heading', { name: 'Sign in to iJac' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('configures Calendar scope and prevents duplicate activation while signing in', async () => {
    let resolveSignIn!: () => void;
    signInWithPopup.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    render(<SignIn />);
    const button = screen.getByRole('button', { name: 'Continuar con Google' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(signInWithPopup).toHaveBeenCalledOnce();
    expect(addScope).toHaveBeenCalledWith('https://www.googleapis.com/auth/calendar');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument();
    expect(screen.getByText('Conectando…')).toBeInTheDocument();

    resolveSignIn();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('keeps the composition and exposes an actionable error when sign-in fails', async () => {
    signInWithPopup.mockRejectedValueOnce(new Error('popup closed'));

    render(<SignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo iniciar sesión.');
    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).not.toBeDisabled();
    expect(alert).not.toHaveTextContent('popup closed');
    expect(alert).not.toHaveTextContent('Firebase');
  });
});
