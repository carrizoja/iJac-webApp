import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ShortcutSettings } from './ShortcutSettings';
import { readShortcutsEnabled, storeShortcutsEnabled } from '../../lib/shortcutsPreference';

describe('ShortcutSettings', () => {
  beforeEach(() => window.localStorage.clear());

  it('offers an on/off switch, on by default, that is remembered', () => {
    render(<ShortcutSettings />);
    const toggle = screen.getByRole('checkbox', { name: 'Activar atajos de teclado' });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAttribute('switch');

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(readShortcutsEnabled()).toBe(false);

    fireEvent.click(toggle);
    expect(readShortcutsEnabled()).toBe(true);
  });

  it('starts off when they were turned off before', () => {
    storeShortcutsEnabled(false);
    render(<ShortcutSettings />);
    expect(screen.getByRole('checkbox', { name: 'Activar atajos de teclado' })).not.toBeChecked();
  });

  it('lists every shortcut with its key', () => {
    render(<ShortcutSettings />);
    const list = screen.getByRole('list', { name: 'Atajos disponibles' });
    const items = within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(items).toEqual(['NNueva orden', 'CNuevo cliente', '/Buscar en la página']);
    expect(screen.getByText(/no funcionan mientras escribís/i)).toBeInTheDocument();
  });
});
