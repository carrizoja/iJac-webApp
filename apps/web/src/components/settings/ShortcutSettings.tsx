import { useEffect, useId, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';
import { readShortcutsEnabled, storeShortcutsEnabled } from '../../lib/shortcutsPreference';

const SHORTCUTS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'N', labelKey: 'workOrders.new' },
  { key: 'C', labelKey: 'clients.new' },
  { key: '/', labelKey: 'settings.shortcuts.search' },
];

/**
 * Turns the single-letter shortcuts on or off for this browser (WCAG 2.1.4) and lists them.
 * The switch is a checkbox with the `switch` attribute: browsers without it show a checkbox.
 */
export function ShortcutSettings() {
  const { t } = useLanguage();
  const listId = useId();
  // Read after mount: the server render cannot see this browser's stored choice.
  const [enabled, setEnabled] = useState(true);
  useEffect(() => setEnabled(readShortcutsEnabled()), []);

  return (
    <div className="space-y-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-fg-primary">
        <input
          type="checkbox"
          {...({ switch: '' } as Record<string, string>)}
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            storeShortcutsEnabled(event.target.checked);
          }}
          className="h-5 w-5 cursor-pointer accent-accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        />
        <span className="font-medium">{t('settings.shortcuts.toggle')}</span>
      </label>
      <p id={`${listId}-hint`} className="text-sm text-fg-secondary">
        {t('settings.shortcuts.hint')}
      </p>
      <ul
        aria-label={t('settings.shortcuts.list')}
        aria-describedby={`${listId}-hint`}
        className="space-y-2 text-sm"
      >
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.key} className="flex items-center gap-3">
            <kbd className="inline-flex min-w-8 justify-center rounded-md border border-border-default bg-panel-default px-2 py-0.5 font-mono text-xs text-fg-primary">
              {shortcut.key}
            </kbd>
            <span className="text-fg-secondary">{t(shortcut.labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
