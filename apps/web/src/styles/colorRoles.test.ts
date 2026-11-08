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

/** A token's value in the dark (`:root`) or light (`:root.light`) theme block. */
function token(name: string, theme: 'dark' | 'light'): string {
  const start = css.indexOf(theme === 'dark' ? ':root {' : ':root.light {');
  const block = css.slice(start, css.indexOf('\n  }', start));
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, `${name} in ${theme}`).not.toBeNull();
  return match![1].trim().toLowerCase();
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

  it.each(['dark', 'light'] as const)(
    'gives warning its own hue, apart from the in-progress status (%s)',
    (theme) => {
      expect(token('--color-warning', theme)).not.toBe(token('--color-status-in-progress', theme));
    },
  );

  it.each(['dark', 'light'] as const)(
    'keeps the focus ring off every status and info hue (%s)',
    (theme) => {
      const focus = token('--color-focus', theme);
      for (const status of ['open', 'in-progress', 'completed', 'cancelled']) {
        expect(focus, status).not.toBe(token(`--color-status-${status}`, theme));
      }
      expect(focus).not.toMatch(/^#(3b82f6|60a5fa|1d4ed8|0369a1)$/);
      expect(token('--color-focus-offset', theme)).not.toBe(focus);
    },
  );

  it('draws the Tailwind focus ring from the theme tokens, not a fixed blue', () => {
    expect(tailwind).not.toContain('#60a5fa');
  });

  it('outlines urgent priority instead of filling it with the destructive red', () => {
    const urgent = rule('.priority-urgent-badge');
    expect(urgent).toContain('background: transparent');
    expect(urgent).not.toContain('background: var(--color-destructive)');
  });

  it.each(['dark', 'light'] as const)('drops the glow from destructive hover (%s)', (theme) => {
    // A blurred shadow is a glow; delete keeps a crisp 1px ring only.
    expect(token('--shadow-action-delete', theme)).not.toMatch(/\b\d+(px)? \d+px \d+px/);
  });

  it('tints delete confirmations as danger, not as a warning', () => {
    for (const file of [
      'components/work-orders/WorkOrderList.tsx',
      'components/clients/ClientList.tsx',
    ]) {
      const source = readFileSync(resolve(process.cwd(), 'src', file), 'utf8');
      expect(source, file).not.toMatch(/\b(bg|border)-warning\b/);
    }
  });
});
