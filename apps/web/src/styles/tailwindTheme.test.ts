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
  it('maps text-accent-light to the themed accent token, not a fixed slate', async () => {
    const css = await cssFor('text-accent-light');
    expect(css).toContain('var(--color-accent-light)');
    expect(css).not.toContain('#334155');
  });

  it('keeps the other accent utilities on their tokens', async () => {
    expect(await cssFor('text-accent-brand')).toContain('var(--color-accent-brand)');
    expect(await cssFor('bg-accent-primary')).toContain('var(--color-accent-primary)');
  });

  it('gives text-fg-muted the themed muted text color', async () => {
    expect(await cssFor('text-fg-muted')).toContain('var(--color-fg-tertiary)');
  });
});
