import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import config from '../../tailwind.config.mjs';

async function cssFor(className: string): Promise<string> {
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: `<p class="${className}"></p>` }] }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

describe('tailwind theme colors', () => {
  it('keeps the brand accent on its themed token', async () => {
    expect(await cssFor('text-accent-brand')).toContain('var(--color-accent-brand)');
  });

  it('retires the cyan, purple and priority color utilities', async () => {
    for (const retired of ['text-accent-light', 'bg-accent-primary', 'text-priority-high']) {
      expect((await cssFor(retired)).trim(), retired).toBe('');
    }
  });

  it('gives warnings their own token, with working opacity modifiers', async () => {
    expect(await cssFor('text-warning')).toContain('var(--color-warning)');
    // A plain var() color cannot take /10; the warning tint must actually render.
    expect(await cssFor('bg-warning/10')).toMatch(/var\(--color-warning\) calc\(0\.1 \* 100%\)/);
  });

  it('gives text-fg-muted the themed muted text color', async () => {
    expect(await cssFor('text-fg-muted')).toContain('var(--color-fg-tertiary)');
  });
});
