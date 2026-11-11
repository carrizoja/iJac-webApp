import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { figureClass, sectionHeadingClass } from './typography';

// Anchored to this file, so the scan works whatever directory the tests run from.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function componentSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return componentSources(path);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [path] : [];
  });
}

describe('typography', () => {
  it('names sections with real headings, not small uppercase labels', () => {
    // Table headers and field labels may stay uppercase; section headings may not.
    const offenders = componentSources(root).flatMap((path) =>
      // The whole opening tag, so quoted, template and cn(...) class names are all checked.
      [...readFileSync(path, 'utf8').matchAll(/<h[1-3]\b[^>]*>/gs)]
        .filter(([tag]) => /\buppercase\b/.test(tag))
        .map(() => path.slice(root.length + 1)),
    );
    expect(offenders).toEqual([]);
  });

  it('sets section headings and money figures in the heading face', () => {
    expect(sectionHeadingClass).toContain('font-heading');
    expect(sectionHeadingClass).not.toContain('uppercase');
    expect(figureClass).toContain('font-heading');
    expect(figureClass).toContain('tabular-nums');
  });
});
