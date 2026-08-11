import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const lightTokens = globalCss.match(/:root\.light\s*{([\s\S]*?)\n\s*}/)?.[1] ?? '';

function token(name: string): string {
  const value = lightTokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6})`, 'i'))?.[1];
  if (!value) throw new Error(`Missing light theme token: --${name}`);
  return value;
}

function luminance(hex: string): number {
  const value = hex.length === 4 ? hex.replace(/([0-9a-f])/gi, '$1$1').slice(1) : hex.slice(1);
  const channels = value
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('light theme control boundaries', () => {
  it('keeps default and neutral action borders above 3:1 on light surfaces', () => {
    const defaultBorder = token('color-border-default');
    const actionBorder = token('color-action-border');

    expect(defaultBorder).toBe('#8492a6');
    expect(actionBorder).toBe(defaultBorder);
    expect(contrast(defaultBorder, token('color-bg-secondary'))).toBeGreaterThanOrEqual(3);
    expect(contrast(defaultBorder, token('color-bg-primary'))).toBeGreaterThanOrEqual(3);
    expect(contrast(actionBorder, token('color-action-surface'))).toBeGreaterThanOrEqual(3);
  });
});
