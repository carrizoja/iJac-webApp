import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from './cn';
import { Button } from './Button';

/**
 * Dialog/Modal component with accessible focus management and Escape key support
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
  secondaryAction = { label: 'Cancel' },
  size = 'md',
  showCloseButton = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * Handle Escape key to close dialog
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

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

    // Add Escape key listener
    document.addEventListener('keydown', handleKeyDown);

    // Move focus to dialog or first focusable element
    if (contentRef.current) {
      const firstFocusable = contentRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 0);
      } else {
        contentRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />

      {/* Dialog Content */}
      <div
        ref={contentRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        className={cn(
          'relative z-10 rounded-lg bg-panel-default border border-border-default',
          'shadow-lg p-6 space-y-4',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          sizeClasses[size]
        )}
        tabIndex={-1}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-fg-muted hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded"
            aria-label="Close dialog"
          >
            ✕
          </button>
        )}

        {/* Title */}
        <h2
          id="dialog-title"
          className="text-lg font-semibold text-fg-primary pr-6"
        >
          {title}
        </h2>

        {/* Description (screen reader only) */}
        {description && (
          <p id="dialog-description" className="sr-only">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="text-sm text-fg-secondary space-y-3">
          {children}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          {secondaryAction && (
            <Button
              variant="secondary"
              size="base"
              onClick={secondaryAction.onClick || onClose}
            >
              {secondaryAction.label}
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
