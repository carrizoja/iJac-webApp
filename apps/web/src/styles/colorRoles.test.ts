import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const tailwind = readFileSync(resolve(process.cwd(), 'tailwind.config.mjs'), 'utf8');

/** The CSS of one rule, e.g. `.action-brand:hover`. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} exists`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('color roles', () => {
  it('has one glow accent: the brand green, with no cyan, purple or sky accents left', () => {
    for (const retired of [
      '--color-gradient-start',
      '--color-gradient-end',
      '--color-primary:',
      '--color-accent-primary',
      '--color-accent-light',
      '--shadow-glow-cyan',
      'login-orb-cyan',
      'login-orb-purple',
    ]) {
      expect(css, retired).not.toContain(retired);
    }
    expect(tailwind).not.toMatch(/accent-primary|accent-light|glow-cyan|gradient-primary/);
    expect(css).toContain('--shadow-glow-brand');
  });

  it('keeps color for status only: priorities and warnings have no shared color', () => {
    expect(css).not.toMatch(/--color-priority-/);
    expect(tailwind).not.toMatch(/priority-(low|normal|high|urgent)/);
    expect(rule('.status-warning')).toContain('var(--color-warning)');
  });

  it('glows edit actions in the brand green instead of a separate cyan', () => {
    expect(rule('.action-edit:hover')).toContain('var(--shadow-action-brand)');
  });

  it('keeps hover text readable on the filled brand green', () => {
    // White on the bright dark-theme green is about 2:1; the hover text has its own token.
    expect(rule('.action-brand:hover')).toContain('color: var(--color-action-brand-hover-fg)');
    expect(rule('.action-edit:hover')).toContain('color: var(--color-action-brand-hover-fg)');
  });
});
