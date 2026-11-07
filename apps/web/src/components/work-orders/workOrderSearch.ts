import type { WorkOrderClientSummary } from '@ijac/shared';

/** Lower case without accents, so "Pérez" and "perez" compare equal. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Whether an order's title or client name contains the search text. Empty text matches all. */
export function matchesOrderSearch(
  order: Pick<WorkOrderClientSummary, 'title' | 'clientName'>,
  search: string,
): boolean {
  const needle = fold(search.trim());
  if (needle === '') return true;
  return fold(order.title).includes(needle) || fold(order.clientName).includes(needle);
}
