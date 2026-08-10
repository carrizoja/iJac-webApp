import { test, expect } from '@playwright/test';

test.describe('branded signed-out access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sign-in-page')).toBeVisible();
  });

  test('shows iJac identity and one supported sign-in action', async ({ page }) => {
    const signInPage = page.getByTestId('sign-in-page');
    await expect(page).toHaveTitle(/iJac Operations/);
    await expect(signInPage.getByRole('heading', { name: 'Ingresar a iJac' })).toBeVisible();
    await expect(signInPage.getByText('Acceso al panel')).toBeVisible();
    await expect(signInPage.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(signInPage.getByRole('button')).toHaveCount(1);
    await expect(signInPage.locator('input')).toHaveCount(0);
  });

  test('fits the centered desktop composition without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });

    const panel = page.getByTestId('sign-in-page').locator('.login-panel');
    const bounds = await panel.boundingBox();
    const viewport = page.viewportSize();

    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeLessThanOrEqual(384);
    expect(bounds!.x).toBeGreaterThan(0);
    expect(bounds!.x + bounds!.width).toBeLessThan(viewport!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport!.width);
  });

  test('adapts on mobile with a usable primary target and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const button = page.getByRole('button', { name: 'Continuar con Google' });
    const bounds = await button.boundingBox();
    const viewport = page.viewportSize();

    expect(bounds).not.toBeNull();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport!.width);
  });

  test('keeps focus visible and reduces login motion when requested', async ({ page }) => {
    const button = page.getByTestId('sign-in-page').getByRole('button', { name: 'Continuar con Google' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    expect(await button.evaluate((element) => element.matches(':focus-visible'))).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animationDuration = await page.locator('.login-reveal').evaluate((element) => getComputedStyle(element).animationDuration);
    expect(['0s', '0.01ms', '1e-05s']).toContain(animationDuration);
  });
});
