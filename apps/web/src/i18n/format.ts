import type { WorkOrder } from '@ijac/shared';
import { translate, type Language, type TranslationKey } from './translations';

const locales: Record<Language, string> = { es: 'es-AR', en: 'en-US' };

export function localeFor(language: Language): string {
  return locales[language];
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

export function formatDateOnly(value: string | undefined, language: Language): string {
  if (!value) return translate(language, 'common.noDate');
  const date = parseDateOnly(value);
  if (!date) return translate(language, 'common.invalidDate');
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'long' }).format(date);
}

export function formatDateTime(value: string | undefined, language: Language): string {
  if (!value) return translate(language, 'common.noDate');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return translate(language, 'common.invalidDate');
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

export function formatMonthYear(value: Date, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { month: 'long', year: 'numeric' }).format(
    value,
  );
}

const statusKeys: Record<WorkOrder['status'], TranslationKey> = {
  open: 'status.open',
  'in-progress': 'status.inProgress',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
};

const priorityKeys: Record<WorkOrder['priority'], TranslationKey> = {
  low: 'priority.low',
  normal: 'priority.normal',
  high: 'priority.high',
  urgent: 'priority.urgent',
};

export function statusLabel(status: WorkOrder['status'], language: Language): string {
  return translate(language, statusKeys[status]);
}

export function priorityLabel(priority: WorkOrder['priority'], language: Language): string {
  return translate(language, priorityKeys[priority]);
}
