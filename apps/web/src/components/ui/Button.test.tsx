import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Button } from './Button';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('Button', () => {
  it('renders as a button element', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('renders with primary variant by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('action-brand', 'border-2');
  });

  it('styles the primary variant with a class that global.css defines', () => {
    expect(globalCss).toMatch(/\.action-brand\s*{[^}]*background:/);
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button', { name: /secondary/i });
    // The neutral outline every screen uses next to a primary action.
    expect(button).toHaveClass('action-surface', 'border');
  });

  it('renders the edit and delete outline variants used for row actions', () => {
    render(
      <>
        <Button variant="edit">Edit</Button>
        <Button variant="delete">Delete</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveClass('action-edit', 'border-2');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('action-delete', 'border-2');
  });

  it('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button', { name: /ghost/i });
    expect(button).toHaveClass('text-fg-primary');
    expect(button).not.toHaveClass('action-brand');
  });

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-destructive', 'text-white');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('h-11');
  });

  it('disables the button when disabled is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('disables the button when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('sets pending state when pending is true', () => {
    render(<Button pending>Pending</Button>);
    const button = screen.getByRole('button', { name: /pending/i });
    expect(button).toHaveClass('opacity-70');
  });

  it('renders start icon', () => {
    render(<Button startIcon={<span data-testid="start-icon">⭐</span>}>With icon</Button>);
    const icon = screen.getByTestId('start-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('mr-2');
  });

  it('renders end icon', () => {
    render(<Button endIcon={<span data-testid="end-icon">→</span>}>With icon</Button>);
    const icon = screen.getByTestId('end-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('ml-2');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button', { name: /click/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not fire click event when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click
      </Button>,
    );
    const button = screen.getByRole('button', { name: /click/i });
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not fire click event when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Loading
      </Button>,
    );
    const button = screen.getByRole('button', { name: /loading/i });
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('merges conflicting Tailwind classes correctly', () => {
    // When passing a className that conflicts with variant styles,
    // the custom className should win
    render(
      <Button className="bg-destructive text-slate-100" variant="primary">
        Merged
      </Button>,
    );
    const button = screen.getByRole('button', { name: /merged/i });
    expect(button).toHaveClass('bg-destructive', 'text-slate-100');
    expect(button).not.toHaveClass('bg-gradient-primary');
  });

  it('supports all HTML button attributes', () => {
    render(
      <Button type="submit" title="Submit button">
        Submit
      </Button>,
    );
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('title', 'Submit button');
  });
});
