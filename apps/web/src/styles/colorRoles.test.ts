import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const tailwind = readFileSync(resolve(process.cwd(), 'tailwind.config.mjs'), 'utf8');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx|astro)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

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

  it('leaves no component or page on a retired color class', () => {
    const RETIRED =
      /\b(text|bg|border|border-t)-(accent-primary|accent-light|priority-(low|normal|high|urgent))\b|\bshadow-glow-cyan\b|\bgradient-primary\b|\bstatus-purple\b/;
    const offenders = sources(resolve(process.cwd(), 'src')).filter((path) =>
      RETIRED.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('fills both sign-in glows with the same brand green', () => {
    expect(rule('.login-orb-top')).toContain('var(--color-action-brand)');
    expect(rule('.login-orb-bottom')).toContain('var(--color-action-brand)');
  });
});
