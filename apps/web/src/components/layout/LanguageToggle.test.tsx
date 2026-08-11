import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LANGUAGE_STORAGE_KEY, setLanguage } from '../../i18n/language';
import { LanguageToggle } from './LanguageToggle';

describe('LanguageToggle', () => {
  it('shows the current language while offering the other language', () => {
    render(<LanguageToggle />);
    const button = screen.getByRole('button', { name: 'Cambiar a inglés' });
    expect(button).toHaveClass('h-11', 'min-w-11');
    expect(button).toHaveAttribute('title', 'Cambiar a inglés');
    expect(button.querySelector('[lang="es"]')).toHaveTextContent('ES');
  });

  it('switches both ways and persists exact values', () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a inglés' }));
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('button', { name: 'Switch to Spanish' })).toHaveTextContent('EN');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Spanish' }));
    expect(document.documentElement.lang).toBe('es');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
    expect(screen.getByRole('button', { name: 'Cambiar a inglés' })).toHaveTextContent('ES');
  });

  it('still switches when persistence is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    setLanguage('es');
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a inglés' }));
    expect(document.documentElement.lang).toBe('en');
  });
});
