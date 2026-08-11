import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const layoutSource = readFileSync(resolve(process.cwd(), 'src/layouts/Layout.astro'), 'utf8');
const inlineScript = layoutSource.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];

function runThemeInitializer() {
  if (!inlineScript) throw new Error('Theme initialization script was not found');
  Function(inlineScript)();
}

describe('Layout theme initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.documentElement.className = 'light';
    document.documentElement.style.colorScheme = '';
    document.documentElement.lang = 'en';
  });

  it('emits an inline head initializer and a dark HTML fallback', () => {
    expect(layoutSource).toContain('<html lang="es" class="dark">');
    expect(layoutSource).toContain('<script is:inline>');
    expect(layoutSource.indexOf('<script is:inline>')).toBeLessThan(layoutSource.indexOf('<body'));
    expect(layoutSource).toContain("window.localStorage.getItem('ijac-theme')");
    expect(layoutSource).toContain("window.localStorage.getItem('ijac-language')");
    expect(layoutSource).toContain('initializeDomTranslations();');
  });

  it('defaults invalid or absent preferences to dark before paint', () => {
    window.localStorage.setItem('ijac-theme', 'sepia');

    runThemeInitializer();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).not.toHaveClass('light');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.lang).toBe('es');
  });

  it('applies a valid stored light preference', () => {
    window.localStorage.setItem('ijac-theme', 'light');

    runThemeInitializer();

    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('applies only a valid stored English preference before paint', () => {
    window.localStorage.setItem('ijac-language', 'en');
    runThemeInitializer();
    expect(document.documentElement.lang).toBe('en');

    window.localStorage.setItem('ijac-language', 'fr');
    runThemeInitializer();
    expect(document.documentElement.lang).toBe('es');
  });

  it('falls back to dark when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    runThemeInitializer();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.lang).toBe('es');
  });
});
