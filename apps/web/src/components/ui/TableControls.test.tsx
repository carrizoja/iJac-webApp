import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SortableHeader } from './TableControls';

function renderHeaders(sort: { key: 'title' | 'date'; direction: 'asc' | 'desc' }) {
  render(
    <table>
      <thead>
        <tr>
          <SortableHeader sortKey="title" sort={sort} onSort={vi.fn()}>
            Título
          </SortableHeader>
          <SortableHeader sortKey="date" sort={sort} onSort={vi.fn()}>
            Fecha
          </SortableHeader>
        </tr>
      </thead>
    </table>,
  );
  const arrow = (name: string) =>
    screen.getByRole('button', { name }).querySelector('[aria-hidden="true"]');
  return { arrow };
}

describe('SortableHeader', () => {
  it('shows the sort direction only on the sorted column', () => {
    const { arrow } = renderHeaders({ key: 'title', direction: 'desc' });
    expect(arrow('Título')).toHaveTextContent('↓');
    // An unsorted column offers sorting without looking already sorted.
    expect(arrow('Fecha')).toHaveTextContent('↕');
    expect(screen.getByRole('columnheader', { name: 'Fecha' })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('shows an up arrow for ascending order', () => {
    const { arrow } = renderHeaders({ key: 'date', direction: 'asc' });
    expect(arrow('Fecha')).toHaveTextContent('↑');
    expect(arrow('Título')).toHaveTextContent('↕');
  });
});
