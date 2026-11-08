import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const css = postcss.parse(readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8'));

/** Every declaration of `property` in rules whose selector list names `.className`. */
function declarations(className: string, property: string): string[] {
  const values: string[] = [];
  css.walkRules((rule: Rule) => {
    if (!rule.selectors.includes(`.${className}`)) return;
    rule.walkDecls(property, (decl) => {
      values.push(decl.value);
    });
  });
  return values;
}

describe('priority badge colors', () => {
  it('keeps low and normal priority uncolored so they never echo a status hue', () => {
    for (const priority of ['low', 'normal']) {
      const colors = declarations(`priority-${priority}-badge`, 'color');
      expect(colors).toEqual(['var(--color-fg-secondary)']);
    }
  });

  it('marks high priority by weight and outline in the primary text color, not amber', () => {
    expect(declarations('priority-high-badge', 'color')).toEqual(['var(--color-fg-primary)']);
    expect(declarations('priority-high-badge', 'font-weight')).toContain('600');
  });

  it('outlines urgent priority in the red text color, without a fill', () => {
    expect(declarations('priority-urgent-badge', 'background')).toEqual(['transparent']);
    expect(declarations('priority-urgent-badge', 'color')).toEqual([
      'var(--color-destructive-text)',
    ]);
  });

  it('never uses the status color tokens for a priority badge', () => {
    for (const priority of ['low', 'normal', 'high', 'urgent']) {
      for (const property of ['color', 'background', 'border']) {
        for (const value of declarations(`priority-${priority}-badge`, property)) {
          expect(value).not.toMatch(/--color-(status|priority)-/);
        }
      }
    }
  });
});
