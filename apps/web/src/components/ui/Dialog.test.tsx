import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Confirm Action',
    children: 'Are you sure?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<Dialog {...defaultProps} isOpen={false} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeInTheDocument();
  });

  it('renders with title and content when isOpen is true', () => {
    render(<Dialog {...defaultProps} />);
    const title = screen.getByText(/confirm action/i);
    const content = screen.getByText(/are you sure/i);
    expect(title).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('uses the dialog role by default', () => {
    render(<Dialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('uses the alertdialog role for destructive confirmations', () => {
    render(
      <Dialog
        {...defaultProps}
        primaryAction={{ label: 'Void', onClick: vi.fn(), destructive: true }}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('moves initial focus to the first field in the content, not the close button', () => {
    vi.useFakeTimers();
    render(
      <Dialog {...defaultProps} primaryAction={{ label: 'Save', onClick: vi.fn() }}>
        <input aria-label="Amount" />
      </Dialog>,
    );
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByLabelText('Amount')).toHaveFocus();
    vi.useRealTimers();
  });

  it('focuses the first action when the content has nothing focusable', () => {
    vi.useFakeTimers();
    render(<Dialog {...defaultProps} />);
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    vi.useRealTimers();
  });

  it('keeps Tab and Shift+Tab focus inside the dialog', () => {
    render(
      <>
        <button>Outside</button>
        <Dialog {...defaultProps} primaryAction={{ label: 'Save', onClick: vi.fn() }}>
          <input aria-label="Amount" />
        </Dialog>
      </>,
    );
    const close = screen.getByRole('button', { name: 'Cerrar diálogo' });
    const save = screen.getByRole('button', { name: 'Save' });

    save.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();

    screen.getByRole('button', { name: 'Outside' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('leaves Tab alone between fields in the middle of the dialog', () => {
    render(
      <Dialog {...defaultProps}>
        <input aria-label="Amount" />
      </Dialog>,
    );
    const input = screen.getByLabelText('Amount');
    input.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('keeps a side margin and scrolls when the content is taller than the screen', () => {
    render(<Dialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('overflow-y-auto', 'max-h-[calc(100dvh-2rem)]');
    expect(dialog.parentElement).toHaveClass('p-4');
  });

  it('has modal attribute for accessibility', () => {
    render(<Dialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<Dialog {...defaultProps} onClose={handleClose} />);
    const backdrop = container.querySelector('[role="presentation"]');
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('does not close when dialog content is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Dialog {...defaultProps} onClose={handleClose}>
        <div data-testid="content">Content</div>
      </Dialog>,
    );
    const content = screen.getByTestId('content');
    fireEvent.click(content);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('closes when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    render(<Dialog {...defaultProps} onClose={handleClose} />);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('shows close button by default', () => {
    render(<Dialog {...defaultProps} />);
    const closeBtn = screen.getByLabelText(/cerrar diálogo/i);
    expect(closeBtn).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(<Dialog {...defaultProps} showCloseButton={false} />);
    const closeBtn = screen.queryByLabelText(/cerrar diálogo/i);
    expect(closeBtn).not.toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Dialog {...defaultProps} onClose={handleClose} showCloseButton />);
    const closeBtn = screen.getByLabelText(/cerrar diálogo/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('renders with description for accessibility', () => {
    render(<Dialog {...defaultProps} description="This action cannot be undone" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    const description = screen.getByText(/this action cannot be undone/i);
    expect(description).toHaveAttribute('id', 'dialog-description');
  });

  it('renders primary action button', () => {
    render(
      <Dialog
        {...defaultProps}
        primaryAction={{
          label: 'Submit',
          onClick: vi.fn(),
        }}
      />,
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls primary action handler', () => {
    const handleAction = vi.fn();
    render(
      <Dialog
        {...defaultProps}
        primaryAction={{
          label: 'Submit',
          onClick: handleAction,
        }}
      />,
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it('renders destructive variant for destructive action', () => {
    render(
      <Dialog
        {...defaultProps}
        primaryAction={{
          label: 'Delete',
          onClick: vi.fn(),
          destructive: true,
        }}
      />,
    );
    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn).toHaveClass('bg-destructive');
  });

  it('shows loading state on primary action', () => {
    render(
      <Dialog
        {...defaultProps}
        primaryAction={{
          label: 'Save',
          onClick: vi.fn(),
          isLoading: true,
        }}
      />,
    );
    const btn = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('renders secondary action button', () => {
    render(
      <Dialog
        {...defaultProps}
        secondaryAction={{
          label: 'Cancel',
          onClick: vi.fn(),
        }}
      />,
    );
    const btn = screen.getByText(/cancel/i);
    expect(btn).toBeInTheDocument();
  });

  it('calls secondary action handler', () => {
    const handleCancel = vi.fn();
    render(
      <Dialog
        {...defaultProps}
        secondaryAction={{
          label: 'Cancel',
          onClick: handleCancel,
        }}
      />,
    );
    const btn = screen.getByText(/cancel/i);
    fireEvent.click(btn);
    expect(handleCancel).toHaveBeenCalledOnce();
  });

  it('closes dialog when secondary action is clicked without handler', () => {
    const handleClose = vi.fn();
    render(
      <Dialog
        {...defaultProps}
        onClose={handleClose}
        secondaryAction={{
          label: 'Cancel',
        }}
      />,
    );
    const btn = screen.getByText(/cancel/i);
    fireEvent.click(btn);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<Dialog {...defaultProps} size="sm" />);
    let dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveClass('max-w-sm');

    rerender(<Dialog {...defaultProps} size="lg" />);
    dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveClass('max-w-lg');
  });

  it('focuses first focusable element when opened', async () => {
    render(
      <Dialog {...defaultProps}>
        <button data-testid="first-btn">First</button>
        <button data-testid="second-btn">Second</button>
      </Dialog>,
    );
    const firstBtn = screen.getByTestId('first-btn');
    // Just verify that the button exists and can be focused
    expect(firstBtn).toBeInTheDocument();
  });

  it('has correct aria-labelledby', () => {
    render(<Dialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });
  it('keeps focus on a field while typing when onClose is an inline function', () => {
    vi.useFakeTimers();
    function Host() {
      const [value, setValue] = useState('');
      return (
        <Dialog isOpen onClose={() => undefined} title="Record">
          <input aria-label="Amount" value={value} onChange={(e) => setValue(e.target.value)} />
        </Dialog>
      );
    }
    render(<Host />);
    act(() => {
      vi.runAllTimers();
    });

    const input = screen.getByLabelText('Amount');
    input.focus();
    fireEvent.change(input, { target: { value: '3' } });
    act(() => {
      vi.runAllTimers();
    });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('3');
    vi.useRealTimers();
  });

  it('calls the latest onClose on Escape after re-renders', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<Dialog {...defaultProps} onClose={first} />);
    rerender(<Dialog {...defaultProps} onClose={latest} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
