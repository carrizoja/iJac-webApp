import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translations } from '../../i18n/translations';

const page = readFileSync(resolve(process.cwd(), 'src/pages/clients/index.astro'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'src/components/layout/AppShell.tsx'), 'utf8');

describe('Clients page', () => {
  it('leaves the single main landmark to the app shell', () => {
    expect(shell).toContain('<main');
    expect(page).not.toMatch(/<main\b/);
  });

  it('opens with the same plain heading and one-line description as the other pages', () => {
    expect(page).toMatch(/<h1[^>]*data-i18n="clients\.pageHeading"/);
    expect(page).toMatch(/<p[^>]*data-i18n="clients\.pageDescription"/);
    expect(page).not.toContain('clients.hero');
    expect(page).not.toMatch(/text-(4|5|6)xl/);
    expect(translations.es['clients.pageHeading']).toBe('Clientes');
    expect(translations.es['clients.pageDescription']).toBe(
      'Contactos, organizaciones y notas de tus clientes.',
    );
    expect(translations.en['clients.pageHeading']).toBe('Clients');
    expect(translations.en['clients.pageDescription']).toBe(
      'Contacts, organizations and notes for your clients.',
    );
  });

  it('keeps the breadcrumb to the current location', () => {
    expect(page).toContain('aria-current="page"');
    expect(page).toContain('data-i18n-attr="aria-label:clients.breadcrumb"');
  });
});
