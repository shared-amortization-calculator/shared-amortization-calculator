import { test, expect } from '@playwright/test';

test('loads the app', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Mortgage Split: shared mortgage equity calculator');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mortgage Split' }),
  ).toBeVisible();
});
