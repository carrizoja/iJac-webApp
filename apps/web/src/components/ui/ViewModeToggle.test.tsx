import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it('renders Tarjetas and Tabla buttons with correct pressed state', () => {
    render(<ViewModeToggle value="cards" onChange={vi.fn()} />);

    const cardsBtn = screen.getByRole('button', { name: 'Tarjetas' });
    const tableBtn = screen.getByRole('button', { name: 'Tabla' });

    expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: 'Modo de visualización' })).toBeInTheDocument();
  });

  it('reflects table mode selection and responds to clicks', () => {
    const onChange = vi.fn();
    render(<ViewModeToggle value="table" onChange={onChange} ariaLabel="Vista de clientes" />);

    const cardsBtn = screen.getByRole('button', { name: 'Tarjetas' });
    const tableBtn = screen.getByRole('button', { name: 'Tabla' });

    expect(cardsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Vista de clientes' })).toBeInTheDocument();

    fireEvent.click(cardsBtn);
    expect(onChange).toHaveBeenCalledWith('cards');
  });
});
