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
const darkTokens = globalCss.match(/:root\s*{([\s\S]*?)\n\s*}/)?.[1] ?? '';

function darkToken(name: string): string {
  const value = darkTokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6})`, 'i'))?.[1];
  if (!value) throw new Error(`Missing dark theme token: --${name}`);
  return value;
}

function expandHex(hex: string): string {
  return hex.length === 4 ? `#${hex.slice(1).replace(/./g, '$&$&')}` : hex;
}

/** The badge background: 12% of the badge color over the surface (see .status-*-badge). */
function tint(color: string, surface: string, amount = 0.12): string {
  const [c, s] = [expandHex(color), expandHex(surface)];
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(amount * channel(c, i) + (1 - amount) * channel(s, i)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
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

describe('status badge text', () => {
  const statuses = ['open', 'in-progress', 'completed', 'cancelled'];
  const surfaces = ['bg-primary', 'bg-secondary', 'panel-default', 'panel-elevated'];

  it.each([
    ['dark', darkToken],
    ['light', token],
  ] as const)('stays at 4.5:1 or more on every %s surface', (_theme, read) => {
    for (const status of statuses) {
      const color = read(`color-status-${status}`);
      for (const surface of surfaces) {
        const background = tint(color, read(`color-${surface}`));
        expect(
          contrast(color, background),
          `${status} on ${surface} (${color} on ${background})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
