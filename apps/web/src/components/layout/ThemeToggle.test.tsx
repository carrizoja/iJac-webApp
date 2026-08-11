import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { THEME_STORAGE_KEY, ThemeToggle } from './ThemeToggle';

function setDocumentTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    setDocumentTheme('dark');
  });

  it('offers the light theme when the applied default is dark', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: 'Cambiar a tema claro' });
    expect(button).toHaveClass('h-11', 'w-11');
    expect(button).toHaveClass(/focus-visible/);
    expect(button.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  });

  it('reconciles with a pre-applied stored light theme', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setDocumentTheme('light');

    render(<ThemeToggle />);

    expect(
      await screen.findByRole('button', { name: 'Cambiar a tema oscuro' }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('changes classes, color scheme, persistence, and accessible text on click', async () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }));

    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(
      await screen.findByRole('button', { name: 'Cambiar a tema oscuro' }),
    ).toBeInTheDocument();
  });

  it('remains keyboard operable through native button behavior', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: 'Cambiar a tema claro' });
    button.focus();
    expect(button).toHaveFocus();
    expect(button.tagName).toBe('BUTTON');
    expect(button).not.toHaveAttribute('tabindex', '-1');

    fireEvent.click(button);
    expect(document.documentElement).toHaveClass('light');
  });

  it('still applies the theme when persistence throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }));

    expect(document.documentElement).toHaveClass('light');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeInTheDocument();
    });
  });
});
