const STORAGE_KEY = 'ijac.shortcuts';

/**
 * Whether single-letter keyboard shortcuts are on in this browser. On by default; they can be
 * turned off in Settings (WCAG 2.1.4). Storage can be blocked, so a failed read keeps them on.
 */
export function readShortcutsEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function storeShortcutsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Not remembered when storage is blocked; the switch still reflects the choice on screen.
  }
}
