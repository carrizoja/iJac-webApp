import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { setLanguage } from '../i18n/language';
import { useLanguage } from './useLanguage';

function LanguageProbe({ name }: { name: string }) {
  const { language, t } = useLanguage();
  return (
    <output aria-label={name}>
      {language}:{t('nav.home')}
    </output>
  );
}

describe('useLanguage', () => {
  it('synchronizes independent React roots through the external store', () => {
    render(<LanguageProbe name="first-root" />);
    render(<LanguageProbe name="second-root" />);

    act(() => setLanguage('en'));

    expect(screen.getByLabelText('first-root')).toHaveTextContent('en:Home');
    expect(screen.getByLabelText('second-root')).toHaveTextContent('en:Home');
  });
});
