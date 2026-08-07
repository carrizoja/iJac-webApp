import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Panel,
  Badge,
  Alert,
  LoadingState,
  EmptyState,
} from './States';

describe('Panel', () => {
  it('renders with default variant', () => {
    const { container } = render(<Panel>Content</Panel>);
    const panel = container.firstChild;
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('rounded-lg');
  });

  it('renders with elevated variant', () => {
    const { container } = render(<Panel variant="elevated">Elevated</Panel>);
    const panel = container.firstChild;
    expect(panel).toHaveClass('shadow-md');
  });

  it('renders with bordered variant', () => {
    const { container } = render(<Panel variant="bordered">Bordered</Panel>);
    const panel = container.firstChild;
    expect(panel).toHaveClass('border-2');
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<Panel size="sm">Small</Panel>);
    let panel = container.firstChild;
    expect(panel).toHaveClass('p-3');

    rerender(<Panel size="lg">Large</Panel>);
    panel = container.firstChild;
    expect(panel).toHaveClass('p-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Panel className="custom-class">Custom</Panel>);
    const panel = container.firstChild;
    expect(panel).toHaveClass('custom-class');
  });
});

describe('Badge', () => {
  it('renders a badge', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText(/default/i);
    expect(badge).toBeInTheDocument();
  });

  it('renders with success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-opacity-20');
  });

  it('renders with warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild;
    expect(badge).toBeInTheDocument();
  });

  it('renders with error variant', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-opacity-20');
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<Badge size="xs">Tiny</Badge>);
    let badge = container.firstChild;
    expect(badge).toHaveClass('text-xs');

    rerender(<Badge size="md">Medium</Badge>);
    badge = container.firstChild;
    expect(badge).toHaveClass('font-semibold');
  });

  it('shows remove button when onRemove is provided', () => {
    render(<Badge onRemove={() => {}}>Removable</Badge>);
    const removeBtn = screen.getByLabelText(/remove badge/i);
    expect(removeBtn).toBeInTheDocument();
    expect(removeBtn).toHaveTextContent('✕');
  });

  it('calls onRemove handler when remove button is clicked', () => {
    const handleRemove = vi.fn();
    render(<Badge onRemove={handleRemove}>Removable</Badge>);
    const removeBtn = screen.getByLabelText(/remove badge/i);
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledOnce();
  });
});

describe('Alert', () => {
  it('renders with role="alert"', () => {
    render(<Alert>Alert message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('renders with info type by default', () => {
    render(<Alert>Info</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('p-4', 'rounded-lg');
  });

  it('renders with success type', () => {
    render(<Alert type="success">Success</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('renders with warning type', () => {
    render(<Alert type="warning">Warning</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('renders with error type', () => {
    render(<Alert type="error">Error</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('displays icon when provided', () => {
    render(<Alert icon={<span data-testid="alert-icon">⚠️</span>}>Alert</Alert>);
    const icon = screen.getByTestId('alert-icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows action button when provided', () => {
    render(
      <Alert action={{ label: 'Undo', onClick: () => {} }}>Action alert</Alert>
    );
    const actionBtn = screen.getByText(/undo/i);
    expect(actionBtn).toBeInTheDocument();
  });

  it('calls action handler when button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <Alert action={{ label: 'Click', onClick: handleAction }}>Alert</Alert>
    );
    const actionBtn = screen.getByText(/click/i);
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it('shows close button when onClose is provided', () => {
    render(<Alert onClose={() => {}}>Closeable</Alert>);
    const closeBtn = screen.getByLabelText(/dismiss alert/i);
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onClose handler when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Alert onClose={handleClose}>Closeable</Alert>);
    const closeBtn = screen.getByLabelText(/dismiss alert/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledOnce();
  });
});

describe('LoadingState', () => {
  it('renders spinner by default', () => {
    render(<LoadingState />);
    const spinner = screen.getByText(/loading.../i)
      .previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  it('renders skeleton variant', () => {
    render(<LoadingState variant="skeleton" />);
    const skeleton = screen.getByText(/loading.../i)
      .previousElementSibling;
    expect(skeleton).toHaveClass('animate-pulse', 'bg-panel-default');
  });

  it('renders pulse variant', () => {
    render(<LoadingState variant="pulse" />);
    const pulse = screen.getByText(/loading.../i)
      .previousElementSibling;
    expect(pulse).toHaveClass('animate-pulse', 'rounded-full');
  });

  it('displays custom message', () => {
    render(<LoadingState message="Please wait..." />);
    const message = screen.getByText(/please wait.../i);
    expect(message).toBeInTheDocument();
  });

  it('renders without message when message prop is undefined', () => {
    const { container } = render(<LoadingState message={undefined} />);
    // Should still have the loading indicator, just no text
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    let loader = screen.getByText(/loading.../i).previousElementSibling;
    expect(loader).toHaveClass('w-4', 'h-4');

    rerender(<LoadingState size="lg" />);
    loader = screen.getByText(/loading.../i).previousElementSibling;
    expect(loader).toHaveClass('w-12', 'h-12');
  });
});

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No data" />);
    const title = screen.getByText(/no data/i);
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('renders with description', () => {
    render(<EmptyState title="Empty" description="No items found" />);
    const description = screen.getByText(/no items found/i);
    expect(description).toBeInTheDocument();
  });

  it('displays icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<span data-testid="empty-icon">📭</span>}
      />
    );
    const icon = screen.getByTestId('empty-icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows action button when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Create', onClick: () => {} }}
      />
    );
    const actionBtn = screen.getByText(/create/i);
    expect(actionBtn).toBeInTheDocument();
  });

  it('calls action handler when button is clicked', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add', onClick: handleAction }}
      />
    );
    const actionBtn = screen.getByText(/add/i);
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Custom" className="custom-class" />
    );
    const emptyState = container.firstChild;
    expect(emptyState).toHaveClass('custom-class');
  });
});
