import { test, expect } from '@playwright/test';

test.describe('Clients route boundary', () => {
  test('operates the mobile navigation disclosure without page overflow', async ({ page }) => {
    await page.route('**/src/hooks/useAuth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export function useAuth() {
          return {
            user: { uid: 'e2e-user', email: 'e2e@ijacitsolutions.com', displayName: 'E2E User', photoURL: null },
            token: 'e2e-token',
            loading: false,
            error: null
          };
        }`,
      }),
    );
    await page.route('**/src/lib/auth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export async function getCurrentToken() { return 'e2e-token'; }`,
      }),
    );
    await page.route('**/api/clients**', (route) => route.fulfill({ json: { items: [] } }));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/clients');

    const trigger = page.getByRole('button', { name: 'Abrir navegación principal' });
    await expect(trigger).toBeVisible();
    await expect
      .poll(() => trigger.evaluate((element) => element.getBoundingClientRect().width))
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(() => trigger.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThanOrEqual(44);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-controls', 'mobile-primary-navigation');

    await expect
      .poll(() =>
        trigger.evaluate((element) => !element.closest('astro-island')?.hasAttribute('ssr')),
      )
      .toBe(true);

    await trigger.focus();
    await page.keyboard.press('Enter');

    const mobileNavigation = page.getByRole('navigation', { name: 'Navegación principal móvil' });
    await expect(mobileNavigation).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar navegación principal' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    for (const label of ['Inicio', 'Clientes', 'Órdenes', 'Calendario']) {
      await expect(mobileNavigation.getByRole('link', { name: label })).toBeVisible();
    }

    await page.keyboard.press('Tab');
    await expect(mobileNavigation.getByRole('link', { name: 'Inicio' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(mobileNavigation).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
  });

  test('keeps search focused and non-blocking while requesting the complete term', async ({
    page,
  }) => {
    const requestedSearches: string[] = [];
    const client = {
      id: 'client-1',
      name: 'Acme Inc',
      email: 'acme@example.com',
      phone: '555-0100',
      organization: 'Acme',
      notes: '',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-07T10:00:00.000Z',
      workOrderCount: 0,
    };

    await page.route('**/src/hooks/useAuth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export function useAuth() {
          return {
            user: { uid: 'e2e-user', email: 'e2e@ijacitsolutions.com', displayName: 'E2E User', photoURL: null },
            token: 'e2e-token',
            loading: false,
            error: null
          };
        }`,
      }),
    );
    await page.route('**/src/lib/auth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export async function getCurrentToken() { return 'e2e-token'; }`,
      }),
    );
    await page.route('**/api/clients**', async (route) => {
      const search = new URL(route.request().url()).searchParams.get('search') ?? '';
      requestedSearches.push(search);
      if (search) await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: { items: [client] } });
    });

    await page.goto('/clients');
    const searchInput = page.getByPlaceholder('Buscar clientes...');
    await expect(searchInput).toBeVisible();
    await expect(page.getByText('Acme Inc')).toBeVisible();

    await searchInput.pressSequentially('Acme', { delay: 50 });
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('Acme');
    await expect.poll(() => requestedSearches.filter(Boolean)).toEqual(['Acme']);
    await expect(page.getByRole('status')).toContainText('Buscando clientes...');
    await expect(page.getByText('Acme Inc')).toBeVisible();
    await expect(page.getByRole('status')).toBeHidden();
  });

  test('renders table view by default without document overflow on mobile width', async ({
    page,
  }) => {
    const client = {
      id: 'client-1',
      name: 'Acme Inc',
      email: 'acme@example.com',
      phone: '555-0100',
      organization: 'Acme Corp',
      notes: '',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-07T10:00:00.000Z',
      workOrderCount: 0,
    };

    await page.route('**/src/hooks/useAuth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export function useAuth() {
          return {
            user: { uid: 'e2e-user', email: 'e2e@ijacitsolutions.com', displayName: 'E2E User', photoURL: null },
            token: 'e2e-token',
            loading: false,
            error: null
          };
        }`,
      }),
    );
    await page.route('**/src/lib/auth.ts*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export async function getCurrentToken() { return 'e2e-token'; }`,
      }),
    );
    await page.route('**/api/clients**', (route) => route.fulfill({ json: { items: [client] } }));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/clients');

    await expect(page.getByTestId('client-table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Organización' })).toBeVisible();

    const tableContainer = page.getByTestId('client-table-container');
    const containerScrollWidth = await tableContainer.evaluate((el) => el.scrollWidth);
    const containerClientWidth = await tableContainer.evaluate((el) => el.clientWidth);
    expect(containerScrollWidth).toBeGreaterThan(containerClientWidth);

    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(375);

    const cardsToggleBtn = page.getByRole('button', { name: 'Tarjetas' });
    await cardsToggleBtn.click();
    await expect(page.getByTestId('client-cards')).toBeVisible();
  });

  test('protects the Clients route without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/clients');

    await expect(page).toHaveTitle(/Clientes \| iJac Operations/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
  });

  test('signed-out users receive the accessible authentication boundary', async ({ page }) => {
    await page.goto('/clients');

    await expect(page.getByRole('heading', { name: 'Ingresar a iJac' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
  });
});
