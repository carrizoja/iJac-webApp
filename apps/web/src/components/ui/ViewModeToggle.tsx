import { cn } from './cn';
import { useLanguage } from '../../hooks/useLanguage';

export type ViewMode = 'cards' | 'table';

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  ariaLabel?: string;
  className?: string;
}

function CardsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

export function ViewModeToggle({ value, onChange, ariaLabel, className }: ViewModeToggleProps) {
  const { t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? t('common.viewMode')}
      className={cn(
        'view-mode-surface inline-flex items-center gap-1 rounded-xl border border-border-subtle p-1 text-fg-primary',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
        className={cn(
          'view-mode-option inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          value === 'cards'
            ? 'view-mode-option-active border shadow-sm'
            : 'text-fg-muted hover:text-fg-primary',
        )}
      >
        <CardsIcon />
        <span>{t('common.cards')}</span>
      </button>
      <button
        type="button"
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
        className={cn(
          'view-mode-option inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          value === 'table'
            ? 'view-mode-option-active border shadow-sm'
            : 'text-fg-muted hover:text-fg-primary',
        )}
      >
        <TableIcon />
        <span>{t('common.table')}</span>
      </button>
    </div>
  );
}
