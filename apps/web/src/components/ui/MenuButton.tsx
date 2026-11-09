import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export interface MenuButtonItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Runs after the menu closes. Omit it for a link item. */
  onSelect?: () => void;
  /** Makes the item a link; `external` opens it in a new tab. */
  href?: string;
  external?: boolean;
}

export interface MenuButtonProps {
  /** Base for the button and panel ids. */
  id: string;
  label: string;
  icon?: ReactNode;
  items: MenuButtonItem[];
  disabled?: boolean;
  /** Shows the button as busy, for example while a picked choice saves. */
  isLoading?: boolean;
  /** Quiet note shown under the choices. */
  footer?: ReactNode;
  /** Which edge of the button the panel lines up with. */
  align?: 'start' | 'end';
  className?: string;
}

const itemClass = cn(
  'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-fg-primary',
  'transition-fast hover:bg-panel-hover focus-visible:bg-panel-hover',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
);

/**
 * A secondary button that reveals a short list of choices (a disclosure, not an ARIA menu).
 * Picking a choice, Escape, or pressing elsewhere closes it.
 */
export function MenuButton({
  id,
  label,
  icon,
  items,
  disabled = false,
  isLoading = false,
  footer,
  align = 'start',
  className,
}: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerId = `${id}-button`;
  const panelId = `${id}-menu`;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) document.getElementById(triggerId)?.focus();
  };

  useEffect(() => {
    if (disabled || isLoading) setOpen(false);
  }, [disabled, isLoading]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('[data-menu-item]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const choices = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [],
    );
    const current = choices.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    choices[(current + step + choices.length) % choices.length]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      // Tabbing out of the panel closes it, so it never lingers behind the focus.
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <Button
        id={triggerId}
        type="button"
        variant="secondary"
        className="w-full"
        disabled={disabled}
        isLoading={isLoading}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        startIcon={icon}
        endIcon={
          <ChevronDown
            aria-hidden="true"
            focusable="false"
            className={cn('h-4 w-4 transition-fast', open && 'rotate-180')}
          />
        }
      >
        {label}
      </Button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-labelledby={triggerId}
          onKeyDown={onPanelKeyDown}
          className={cn(
            'absolute top-full z-20 mt-2 w-max min-w-full max-w-[min(18rem,calc(100vw-2rem))]',
            'rounded-lg border border-border-default bg-panel-default p-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                {Icon && (
                  <Icon aria-hidden="true" focusable="false" className="h-4 w-4 text-fg-muted" />
                )}
                {item.label}
              </>
            );
            return item.href ? (
              <a
                key={item.id}
                href={item.href}
                data-menu-item
                className={itemClass}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => close(true)}
              >
                {content}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                data-menu-item
                className={itemClass}
                onClick={() => {
                  close(true);
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
          {footer && (
            <p className="mt-1 border-t border-border-subtle px-3 pb-2 pt-2 text-xs leading-5 text-fg-muted">
              {footer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
