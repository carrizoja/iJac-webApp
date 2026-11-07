import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES } from '@ijac/shared';
import { priorityBadgeClass, statusBadgeClass } from './workOrderBadges';

// Tailwind keeps a component class only if its full name appears in scanned source.
const source = readFileSync(
  resolve(process.cwd(), 'src/components/work-orders/workOrderBadges.ts'),
  'utf8',
);

describe('work-order badge classes', () => {
  it('spells out every status badge class so the build keeps its color', () => {
    for (const status of WORK_ORDER_STATUSES) {
      expect(statusBadgeClass(status)).toBe(`status-${status}-badge`);
      expect(source).toContain(`'status-${status}-badge'`);
    }
  });

  it('spells out every priority badge class so the build keeps its style', () => {
    for (const priority of WORK_ORDER_PRIORITIES) {
      expect(priorityBadgeClass(priority)).toBe(`priority-${priority}-badge`);
      expect(source).toContain(`'priority-${priority}-badge'`);
    }
  });
});
