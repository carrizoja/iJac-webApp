import React, { useEffect, useRef } from 'react';
import { cn } from './cn';
import { Button } from './Button';
import { useLanguage } from '../../hooks/useLanguage';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

/**
 * Dialog/Modal component with accessible focus management and Escape key support.
 * A destructive primary action makes it an `alertdialog`; everything else is a `dialog`.
 */
interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when dialog should close (user clicks cancel or presses Escape) */
  onClose: () => void;
  /** Dialog title */
  title: React.ReactNode;
  /** Dialog content */
  children: React.ReactNode;
  /** Dialog description for accessibility */
  description?: React.ReactNode;
  /** Primary action button configuration */
  primaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    destructive?: boolean;
    isLoading?: boolean;
  };
  /** Secondary action button (usually "Cancel") */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  /** Size of the dialog (sm, md, lg) */
  size?: 'sm' | 'md' | 'lg';
  /** Close button visible (default: true) */
  showCloseButton?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  size = 'md',
  showCloseButton = true,
}: DialogProps) {
  const { t } = useLanguage();
  const resolvedSecondaryAction = secondaryAction ?? { label: t('common.cancel') };
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose without re-running the open effect on every
  // parent render; re-running it would steal focus from the active field.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /**
   * Handle backdrop click to close dialog
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Setup focus management and Escape handler
   */
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before dialog opened
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      // Keep keyboard focus inside the dialog while it is open.
      const focusable = focusableIn(contentRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // The panel itself counts as outside so Shift+Tab from it cannot escape.
      const inside =
        active !== contentRef.current && (contentRef.current?.contains(active) ?? false);
      if (!inside || (e.shiftKey ? active === first : active === last)) {
        e.preventDefault();
        (e.shiftKey && inside ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Start on the first field of the content, then the first action; the close
    // button is only a fallback so typing can begin right away.
    const initial =
      focusableIn(bodyRef.current)[0] ??
      focusableIn(actionsRef.current)[0] ??
      focusableIn(contentRef.current)[0];
    if (initial) {
      setTimeout(() => initial.focus(), 0);
    } else {
      contentRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /**
   * Restore focus when dialog closes
   */
  useEffect(() => {
    if (isOpen) return;

    if (previousActiveElement.current && previousActiveElement.current.focus) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-full max-w-sm',
    md: 'w-full max-w-md',
    lg: 'w-full max-w-lg',
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />

      {/* Dialog Content */}
      <div
        ref={contentRef}
        role={primaryAction?.destructive ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        className={cn(
          'relative z-10 rounded-lg bg-panel-default border border-border-default',
          'shadow-lg p-6 space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          sizeClasses[size],
        )}
        tabIndex={-1}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-fg-muted hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded"
            aria-label={t('common.closeDialog')}
          >
            ✕
          </button>
        )}

        {/* Title */}
        <h2 id="dialog-title" className="text-lg font-semibold text-fg-primary pr-6">
          {title}
        </h2>

        {/* Description (screen reader only) */}
        {description && (
          <p id="dialog-description" className="sr-only">
            {description}
          </p>
        )}

        {/* Content */}
        <div ref={bodyRef} className="text-sm text-fg-secondary space-y-3">
          {children}
        </div>

        {/* Action Buttons */}
        <div ref={actionsRef} className="flex gap-3 justify-end pt-4">
          {resolvedSecondaryAction && (
            <Button
              variant="secondary"
              size="base"
              onClick={resolvedSecondaryAction.onClick || onClose}
            >
              {resolvedSecondaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              variant={primaryAction.destructive ? 'destructive' : 'primary'}
              size="base"
              onClick={primaryAction.onClick}
              isLoading={primaryAction.isLoading}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage dialog open/close state
 */
export function useDialog(initialOpen = false) {
  const [isOpen, setIsOpen] = useOpenState(initialOpen);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}

/**
 * Internal hook for managing open state
 */
function useOpenState(initial: boolean) {
  const [isOpen, setIsOpen] = React.useState(initial);
  return [isOpen, setIsOpen] as const;
}

export type { DialogProps };
