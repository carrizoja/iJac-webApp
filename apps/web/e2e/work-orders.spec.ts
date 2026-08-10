import { test, expect } from '@playwright/test';

test.describe('Work Orders route boundary', () => {
  test('renders table view by default without document overflow on mobile width', async ({ page }) => {
    const workOrder = {
      id: 'wo-1',
      title: 'Mantenimiento preventivo',
      clientId: 'client-1',
      clientName: 'Acme Corp',
      status: 'open',
      priority: 'high',
      dueDate: '2026-08-20T00:00:00.000Z',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-07T10:00:00.000Z',
    };

    const client = {
      id: 'client-1',
      name: 'Acme Corp',
      email: 'acme@example.com',
      phone: '555-0100',
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
    await page.route('**/api/work-orders**', (route) =>
      route.fulfill({ json: { items: [workOrder] } }),
    );
    await page.route('**/api/clients**', (route) =>
      route.fulfill({ json: { items: [client] } }),
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/work-orders');

    await expect(page.getByTestId('work-order-table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Fecha límite' })).toBeVisible();

    const tableContainer = page.getByTestId('work-order-table-container');
    const containerScrollWidth = await tableContainer.evaluate((el) => el.scrollWidth);
    const containerClientWidth = await tableContainer.evaluate((el) => el.clientWidth);
    expect(containerScrollWidth).toBeGreaterThan(containerClientWidth);

    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(375);

    const cardsToggleBtn = page.getByRole('button', { name: 'Tarjetas' });
    await cardsToggleBtn.click();
    await expect(page.getByTestId('work-order-cards')).toBeVisible();
  });

  test('signed-out users receive the accessible authentication boundary', async ({ page }) => {
    await page.goto('/work-orders');

    await expect(page.getByRole('heading', { name: 'Ingresar a iJac' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  });
});
