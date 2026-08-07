import { test, expect } from '@playwright/test';

test('smoke test: homepage loads sign-in page with correct branding', async ({ page }) => {
  await page.goto('/');
  
  // Check that page title is correct or loads
  await expect(page).toHaveTitle(/iJac Operations/);
  
  // Check sign-in heading
  const signInHeading = page.locator('h1', { hasText: 'iJac Operaciones' });
  await expect(signInHeading).toBeVisible();
  
  // Check sign-in button is present
  const signInButton = page.getByRole('button', { name: /Iniciar sesión con Google/i });
  await expect(signInButton).toBeVisible();
});
