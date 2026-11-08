import type { ViewMode } from '../components/ui/ViewModeToggle';

/** Below Tailwind's `sm` breakpoint, where a wide table no longer fits. */
export const PHONE_QUERY = '(max-width: 639px)';

/** The view chosen on the last visit; without one, cards on a phone and a table elsewhere. */
export function readViewMode(storageKey: string): ViewMode {
  // Server rendering has no window; the list re-reads the view once it mounts.
  if (typeof window === 'undefined') return 'table';
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'cards' || stored === 'table') return stored;
  } catch {
    // Storage can be unavailable (private mode); fall back to the screen size.
  }
  return window.matchMedia?.(PHONE_QUERY).matches ? 'cards' : 'table';
}

export function storeViewMode(storageKey: string, mode: ViewMode): void {
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Storage can be unavailable (private mode); the view still changes for this visit.
  }
}
