import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { storeShortcutsEnabled } from '../lib/shortcutsPreference';

const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) =>
  fireEvent.keyDown(target, { key, bubbles: true, ...init });

describe('useKeyboardShortcuts', () => {
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    navigate = vi.fn();
    renderHook(() => useKeyboardShortcuts(navigate));
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens a new order with N and a new client with C, in either case', () => {
    press('n');
    press('C');
    expect(navigate.mock.calls).toEqual([['/work-orders?new=1'], ['/clients?new=1']]);
  });

  it('moves focus to the search box of the page with /, without typing the slash', () => {
    const { getByRole } = render(
      <input type="search" aria-label="Buscar" data-shortcut="search" />,
    );
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(getByRole('searchbox')).toHaveFocus();
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves / alone on a page without a search box', () => {
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ['an input', '<input />'],
    ['a text area', '<textarea></textarea>'],
    ['a select', '<select><option>a</option></select>'],
    ['editable text', '<div contenteditable="true"></div>'],
  ])('ignores the letters while typing in %s', (_name, html) => {
    document.body.innerHTML = html;
    press('n', {}, document.body.firstElementChild as Element);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }])(
    'ignores N with %o',
    (init) => {
      press('n', init);
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('ignores the letters while a dialog is open', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true"><button>Ok</button></div>';
    press('n');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing once shortcuts are turned off', () => {
    storeShortcutsEnabled(false);
    press('n');
    expect(navigate).not.toHaveBeenCalled();
  });
});
