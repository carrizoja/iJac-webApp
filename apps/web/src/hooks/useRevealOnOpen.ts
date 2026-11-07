import { useEffect, useRef } from 'react';

/**
 * Brings an inline panel into view when it opens or switches to another record,
 * moves focus to it, and returns focus to whatever opened it once it closes.
 *
 * `openKey` identifies what the panel shows (for example the record being edited);
 * `null` means the panel is closed.
 */
export function useRevealOnOpen<T extends HTMLElement>(openKey: string | null) {
  const panelRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<T>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (openKey === null) {
      const target = returnTo.current;
      returnTo.current = null;
      // After a save the list reloads, so the trigger may no longer exist.
      if (target?.isConnected) target.focus();
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !panel.contains(active)) returnTo.current = active;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    focusRef.current?.focus({ preventScroll: true });
  }, [openKey]);

  return { panelRef, focusRef };
}
