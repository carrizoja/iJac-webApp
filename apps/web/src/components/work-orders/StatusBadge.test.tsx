import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WorkOrderStatus, WORK_ORDER_STATUSES } from '@ijac/shared';
import { StatusBadge } from './StatusBadge';

function iconOf(status: WorkOrderStatus) {
  const { container } = render(<StatusBadge status={status}>Label</StatusBadge>);
  const badge = container.firstElementChild as HTMLElement;
  return { badge, icon: badge.querySelector('svg') };
}

describe('StatusBadge', () => {
  it('pairs each status color with an icon, so status never depends on color alone', () => {
    for (const status of WORK_ORDER_STATUSES) {
      const { badge, icon } = iconOf(status);
      expect(badge, status).toHaveClass(`status-${status}-badge`);
      expect(icon, status).not.toBeNull();
    }
  });

  it('gives every status a different icon', () => {
    const shapes = WORK_ORDER_STATUSES.map((status) => iconOf(status).icon?.getAttribute('class'));
    expect(new Set(shapes).size).toBe(WORK_ORDER_STATUSES.length);
  });

  it('hides the icon from screen readers and keeps the text as the name', () => {
    const { badge, icon } = iconOf(WorkOrderStatus.COMPLETED);
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(badge).toHaveTextContent(/^Label$/);
  });
});
