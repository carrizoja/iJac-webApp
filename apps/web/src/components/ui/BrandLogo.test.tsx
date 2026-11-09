import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('shows the coloured logo in the light theme and the white one in the dark theme', () => {
    const { container } = render(<BrandLogo alt="iJac" className="h-7 w-7" />);
    const [light, dark] = Array.from(container.querySelectorAll('img'));

    // The white logo nearly vanishes on a light background.
    expect(light).toHaveAttribute('src', '/ijac/logo-positive.png');
    expect(light).toHaveClass('dark:hidden', 'h-7', 'w-7');
    expect(dark).toHaveAttribute('src', '/ijac/logo.png');
    expect(dark).toHaveClass('hidden', 'dark:block', 'h-7', 'w-7');
    // Only one is ever displayed, and each carries the name for that theme.
    expect(light).toHaveAttribute('alt', 'iJac');
    expect(dark).toHaveAttribute('alt', 'iJac');
  });
});
