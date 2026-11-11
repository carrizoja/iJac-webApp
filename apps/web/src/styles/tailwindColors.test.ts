import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../../tailwind.config.mjs';

/** Every color value in the theme, flattened to `name: value` pairs. */
function colorEntries(colors: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(colors).flatMap(([key, value]) => {
    const name = key === 'DEFAULT' ? prefix.replace(/-$/, '') : `${prefix}${key}`;
    return typeof value === 'string'
      ? [[name, value] as [string, string]]
      : colorEntries(value as Record<string, unknown>, `${name}-`);
  });
}

/** Compiles the given classes with the app's Tailwind config. */
async function compile(classes: string[]): Promise<string> {
  const { css } = await postcss([
    tailwindcss({ ...config, content: [{ raw: `<div class="${classes.join(' ')}"></div>` }] }),
  ]).process('@tailwind utilities;', { from: undefined });
  return css;
}

/** The declarations of the rule for one class, as Tailwind escapes it (`:hover` included). */
function declarations(css: string, className: string): string {
  const selector = `.${className.replace(/[:/]/g, '\\$&')}`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}(?::hover)?\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('tailwind colors', () => {
  it('lets every theme color taken from a CSS variable take an opacity modifier', () => {
    // A plain `var(--color-x)` silently drops modifiers such as `bg-bg-primary/60`: Tailwind
    // generates no class at all. `<alpha-value>` lets it apply the opacity.
    const colors = colorEntries((config.theme?.extend?.colors ?? {}) as Record<string, unknown>);
    const fromVariables = colors.filter(([, value]) => value.includes('var(--'));
    // A sanity bound only: it fails if the flattening stops finding the theme's colors.
    expect(fromVariables.length).toBeGreaterThan(20);
    expect(fromVariables.filter(([, value]) => !value.includes('<alpha-value>'))).toEqual([]);
  });

  it('generates the opacity classes in use and leaves plain colors as they were', async () => {
    const css = await compile([
      'bg-bg-primary/60',
      'hover:border-accent-brand/50',
      'bg-bg-primary',
    ]);

    // Tailwind writes the amount as `calc(0.6 * 100%)`; a minifier turns it into `60%`.
    expect(declarations(css, 'bg-bg-primary/60')).toMatch(
      /var\(--color-bg-primary\) (?:60%|calc\(0\.6 \* 100%\))/,
    );
    expect(declarations(css, 'hover:border-accent-brand/50')).toMatch(
      /var\(--color-accent-brand\) (?:50%|calc\(0\.5 \* 100%\))/,
    );
    // Without a modifier the opacity variable is 1, so the color is the token's own.
    const plain = declarations(css, 'bg-bg-primary');
    expect(plain).toMatch(/--tw-bg-opacity:\s*1/);
    expect(plain).toMatch(/var\(--color-bg-primary\) calc\(var\(--tw-bg-opacity, 1\) \* 100%\)/);
  });
});
