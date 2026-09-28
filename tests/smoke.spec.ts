import { test, expect } from '@playwright/test';

test('loads the app', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Shared Amortization Calculator');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Shared Amortization Calculator' }),
  ).toBeVisible();
});
