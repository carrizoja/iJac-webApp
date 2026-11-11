import { useEffect, useRef, type ReactNode } from 'react';
import { Alert } from './States';

interface SavedNoticeProps {
  /** What was saved, e.g. "Orden creada · Revisión". */
  children: ReactNode;
  /** An optional link to the saved record. */
  link?: { href: string; label: string };
  onClose: () => void;
  'data-testid'?: string;
}

/**
 * Confirms a save once its form has closed. The form's controls are gone by then, so focus
 * lands here instead of falling back to the page.
 */
export function SavedNotice({ children, link, onClose, ...props }: SavedNoticeProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      data-testid={props['data-testid']}
    >
      <Alert type="success" role="status" onClose={onClose}>
        {children}
        {link && (
          <>
            {' '}
            <a href={link.href} className="font-semibold underline">
              {link.label}
            </a>
          </>
        )}
      </Alert>
    </div>
  );
}
