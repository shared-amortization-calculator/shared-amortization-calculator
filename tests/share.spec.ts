import { test, expect } from '@playwright/test';

test('a fresh page has no query string', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  expect(new URL(page.url()).search).toBe('');
});

test('edits are kept in the URL and survive a reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('spinbutton', { name: 'Term (exact value)', exact: true }).fill('20');
  await page.getByLabel('Currency').selectOption('USD');
  await expect(page).toHaveURL(/term=20/);
  await expect(page).toHaveURL(/cur=USD/);

  await page.reload();
  await expect(page.getByTestId('payoff')).toHaveText('Year 20, month 12');
  await expect(page.getByLabel('Currency')).toHaveValue('USD');
});

test('a shared link opens with its values', async ({ page }) => {
  await page.goto('./?price=200000&deposit=10&rate=0&term=10&p1=Ana');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.00');
  await expect(page.getByRole('group', { name: 'Ana', exact: true })).toBeVisible();
});

test('a shared link opens in Australian dollars', async ({ page }) => {
  await page.goto('./?cur=AUD');
  await expect(page.getByLabel('Currency')).toHaveValue('AUD');
  await expect(page.getByTestId('monthly-payment')).toHaveText('$1,500.75');
});

test('reset restores the defaults and clears the URL', async ({ page }) => {
  await page.goto('./?price=200000&rate=0&term=10');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  expect(new URL(page.url()).search).toBe('');
});

test('copy scenario copies the current scenario', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.getByRole('spinbutton', { name: 'Term (exact value)', exact: true }).fill('20');
  await page.getByRole('button', { name: 'Copy Scenario' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(copied).searchParams.get('term')).toBe('20');
});
