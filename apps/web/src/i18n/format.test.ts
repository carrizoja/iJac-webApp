import { describe, expect, it } from 'vitest';
import { WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';
import {
  formatDateOnly,
  formatDateTime,
  formatMonthYear,
  localeFor,
  priorityLabel,
  statusLabel,
} from './format';

describe('localized formatting', () => {
  it('maps languages to explicit locales', () => {
    expect(localeFor('es')).toBe('es-AR');
    expect(localeFor('en')).toBe('en-US');
  });

  it('preserves a date-only day without UTC conversion', () => {
    expect(formatDateOnly('2026-08-15T00:00:00.000Z', 'es')).toMatch(/15 de agosto de 2026/i);
    expect(formatDateOnly('2026-08-15', 'en')).toBe('August 15, 2026');
  });

  it('formats month and timestamps for the selected language', () => {
    const month = new Date(2026, 7, 1);
    expect(formatMonthYear(month, 'es')).toMatch(/agosto.*2026/i);
    expect(formatMonthYear(month, 'en')).toBe('August 2026');
    expect(formatDateTime('2026-08-15T12:30:00.000Z', 'en')).toContain('2026');
  });

  it('translates enum presentation while preserving raw domain values', () => {
    expect(statusLabel(WorkOrderStatus.IN_PROGRESS, 'es')).toBe('En progreso');
    expect(statusLabel(WorkOrderStatus.IN_PROGRESS, 'en')).toBe('In progress');
    expect(priorityLabel(WorkOrderPriority.URGENT, 'es')).toBe('Urgente');
    expect(WorkOrderPriority.URGENT).toBe('urgent');
    expect(WorkOrderStatus.IN_PROGRESS).toBe('in-progress');
  });
});
