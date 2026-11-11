import { describe, expect, it } from 'vitest';
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

describe('tailwind colors', () => {
  it('lets every theme color taken from a CSS variable take an opacity modifier', () => {
    // A plain `var(--color-x)` silently drops modifiers such as `bg-bg-primary/60`: Tailwind
    // generates no class at all. `<alpha-value>` lets it apply the opacity.
    const colors = colorEntries((config.theme?.extend?.colors ?? {}) as Record<string, unknown>);
    const fromVariables = colors.filter(([, value]) => value.includes('var(--'));
    expect(fromVariables.length).toBeGreaterThan(20);
    expect(fromVariables.filter(([, value]) => !value.includes('<alpha-value>'))).toEqual([]);
  });
});
