import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), 'src/components');
// The action look belongs to Button's variants (and Badge's brand style), not to each screen.
const OWNERS = ['ui/Button.tsx', 'ui/States.tsx'];
const ACTION_CLASS = /\baction-(brand|surface|edit|delete)\b/;

function componentSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return componentSources(path);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [path] : [];
  });
}

describe('buttons', () => {
  it('style actions through Button variants, not hand-written action classes', () => {
    const offenders = componentSources(root)
      .filter((path) => !OWNERS.includes(path.slice(root.length + 1)))
      .flatMap((path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => ACTION_CLASS.test(line))
          .map(({ index }) => `${path.slice(root.length + 1)}:${index + 1}`),
      );
    expect(offenders).toEqual([]);
  });
});
