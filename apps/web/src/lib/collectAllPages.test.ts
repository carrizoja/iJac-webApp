import { describe, expect, it, vi } from 'vitest';
import { collectAllPages } from './collectAllPages';

describe('collectAllPages', () => {
  it('follows the cursor until the last page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [3], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [4] });

    await expect(collectAllPages(fetchPage)).resolves.toEqual([1, 2, 3, 4]);
    expect(fetchPage.mock.calls).toEqual([[undefined], ['c1'], ['c2']]);
  });

  it('stops after the page limit if the API keeps returning a cursor', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [1], nextCursor: 'again' });

    await expect(collectAllPages(fetchPage, 3)).resolves.toEqual([1, 1, 1]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('treats a missing items array as an empty page and passes errors through', async () => {
    await expect(collectAllPages(vi.fn().mockResolvedValue({}))).resolves.toEqual([]);
    await expect(collectAllPages(vi.fn().mockRejectedValue(new Error('down')))).rejects.toThrow(
      'down',
    );
  });
});
