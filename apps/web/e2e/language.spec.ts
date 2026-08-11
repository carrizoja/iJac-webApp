import { expect, test } from '@playwright/test';

test.describe('application language', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
  });

  test('defaults to Spanish and persists switching both ways across reloads', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/clients');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page).toHaveTitle('Clientes | iJac Operations');
    await expect(page.getByRole('heading', { name: 'Ingresar a iJac' })).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar a inglés' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Clients | iJac Operations');
    await expect(page.getByRole('heading', { name: 'Sign in to iJac' })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(
      /\b(?:signin|nav|clients|workOrders|calendar)\.[A-Za-z]/,
    );
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ijac-language'))).toBe('en');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Clients | iJac Operations');
    await page.getByRole('button', { name: 'Switch to Spanish' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ijac-language'))).toBe('es');
    expect(consoleErrors).toEqual([]);
  });

  test('applies stored English before navigation and stays within a mobile viewport', async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('ijac-language', 'en'));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/calendar');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Calendar | iJac Operations');
    await expect(page.getByRole('button', { name: 'Switch to Spanish' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
  });
});
