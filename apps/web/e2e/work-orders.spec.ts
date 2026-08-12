import { test, expect, type Page } from '@playwright/test';

async function mockAuthenticatedUser(page: Page) {
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
}

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

    await mockAuthenticatedUser(page);
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

  test('keeps order details visible and removes app controls in print media', async ({ page }) => {
    const workOrder = {
      id: 'wo-1',
      title: 'Mantenimiento preventivo',
      description: 'Revisar equipos críticos.',
      clientId: 'client-1',
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
      organization: 'Acme Argentina',
      workOrderCount: 1,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    };

    await mockAuthenticatedUser(page);
    await page.route('**/work-orders/wo-1*', (route) => route.fulfill({ json: workOrder }));
    await page.route('**/clients/client-1*', (route) => route.fulfill({ json: client }));

    await page.goto('/work-orders/details?id=wo-1');

    const title = page.getByRole('heading', { level: 1, name: 'Mantenimiento preventivo' });
    const actionGroup = page.getByRole('group', { name: 'Acciones del documento' });
    await expect(title).toBeVisible();
    await expect(actionGroup.getByRole('button', { name: 'Guardar como PDF' })).toBeVisible();
    await expect(actionGroup.getByRole('link', { name: 'Compartir por WhatsApp' })).toBeVisible();
    await expect(actionGroup.locator('button, a')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Imprimir' })).toHaveCount(0);

    await page.emulateMedia({ media: 'print' });

    await expect(title).toBeVisible();
    await expect(page.getByText('Acme Corp', { exact: true })).toBeVisible();
    await expect(actionGroup).toBeHidden();
    await expect(page.getByRole('link', { name: 'Volver a órdenes' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('[data-print-panel]').first()).toHaveCSS('break-inside', 'avoid');
  });

  test('signed-out users receive the accessible authentication boundary', async ({ page }) => {
    await page.goto('/work-orders');

    await expect(page.getByRole('heading', { name: 'Ingresar a iJac' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  });
});
