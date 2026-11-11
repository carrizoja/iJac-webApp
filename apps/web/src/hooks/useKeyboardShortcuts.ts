import { useEffect } from 'react';
import { newFormHref } from '../lib/newFormLink';
import { readShortcutsEnabled } from '../lib/shortcutsPreference';

/** The page's search box marks itself with this attribute so `/` can focus it. */
export const SEARCH_SHORTCUT_ATTRIBUTE = 'data-shortcut';
export const SEARCH_SHORTCUT_VALUE = 'search';

/** Defined once, so the listener is not re-attached on every render. */
const goTo = (href: string) => window.location.assign(href);

/** True while the user is typing somewhere a letter belongs. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.getAttribute('contenteditable') === 'true' ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/** A dialog takes over the keyboard, so shortcuts must not act behind it. */
function dialogOpen(): boolean {
  return document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]') !== null;
}

/**
 * Single-letter shortcuts for the whole app: N opens a new order, C a new client, and / moves
 * focus to the page's search box. They never act while typing, with Ctrl/Alt/Meta held, during
 * IME composition or under an open dialog, and do nothing once turned off in Settings.
 */
export function useKeyboardShortcuts(navigate: (href: string) => void = goTo): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target) || dialogOpen() || !readShortcutsEnabled()) return;

      const key = event.key.toLowerCase();
      if (key === 'n') {
        navigate(newFormHref('/work-orders'));
      } else if (key === 'c') {
        navigate(newFormHref('/clients'));
      } else if (key === '/') {
        const search = document.querySelector<HTMLElement>(
          `[${SEARCH_SHORTCUT_ATTRIBUTE}="${SEARCH_SHORTCUT_VALUE}"]`,
        );
        if (!search) return;
        event.preventDefault();
        search.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}
