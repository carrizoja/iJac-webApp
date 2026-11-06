/** Default cap on pages, in case the API ever keeps returning a cursor. */
export const MAX_PAGES = 50;

/**
 * Loads every page of a cursor-paginated list. Lists sorted in the browser
 * need all rows, not only the first page.
 */
export async function collectAllPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<{ items?: T[]; nextCursor?: string }>,
  maxPages = MAX_PAGES,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor);
    if (Array.isArray(result?.items)) items.push(...result.items);
    cursor = result?.nextCursor;
    if (!cursor) break;
  }
  return items;
}
