import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setLanguage } from './language';
import { updateTranslatedDom } from './dom';
import { isTranslationKey } from './translations';

describe('Astro DOM translations', () => {
  it('updates known text and allowlisted attributes without using HTML', () => {
    document.body.innerHTML = `
      <h1 data-i18n="home.heading">Fallback</h1>
      <button data-i18n-attr="aria-label:nav.goHome,title:nav.goHome" data-unsafe="keep">X</button>
      <div data-i18n-attr="onclick:nav.goHome">Owned text</div>
    `;
    setLanguage('en');

    updateTranslatedDom();

    expect(document.querySelector('h1')).toHaveTextContent('Operations dashboard');
    expect(document.querySelector('button')).toHaveAttribute('aria-label', 'Go to home');
    expect(document.querySelector('button')).toHaveAttribute('title', 'Go to home');
    expect(document.querySelector('[onclick]')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('<script>');
  });

  it('does not mutate React-owned content without an explicit binding', () => {
    document.body.innerHTML = '<div id="react-root">Inicio</div>';
    setLanguage('en');
    updateTranslatedDom();
    expect(document.getElementById('react-root')).toHaveTextContent('Inicio');
  });

  it('keeps every Astro binding typed and configures title/meta updates', () => {
    const files = [
      'src/layouts/Layout.astro',
      'src/pages/index.astro',
      'src/pages/clients/index.astro',
      'src/pages/work-orders/index.astro',
      'src/pages/work-orders/details.astro',
      'src/pages/calendar/index.astro',
    ];
    const source = files
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');
    const keys = [...source.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
    const attributeKeys = [...source.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((match) =>
      match[1].split(',').map((binding) => binding.slice(binding.indexOf(':') + 1)),
    );

    expect(keys.length).toBeGreaterThan(0);
    expect([...keys, ...attributeKeys].filter((key) => !isTranslationKey(key))).toEqual([]);
    expect(source).toContain('<title data-i18n={titleKey}>');
    expect(source).toContain('data-i18n-attr="content:meta.description"');
  });
});
