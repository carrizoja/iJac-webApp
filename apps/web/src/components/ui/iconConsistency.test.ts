import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), 'src/components');
// Pictographs and dingbats render differently on every platform; icons come from lucide.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function componentSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return componentSources(path);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [path] : [];
  });
}

describe('icons', () => {
  it('uses lucide icons, not emoji or dingbats, in components', () => {
    const offenders = componentSources(root).flatMap((path) =>
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => EMOJI.test(line))
        .map(({ index }) => `${path.slice(root.length + 1)}:${index + 1}`),
    );
    expect(offenders).toEqual([]);
  });
});
