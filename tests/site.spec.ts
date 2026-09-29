import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('shows the disclaimer until dismissed, then remembers', async ({ page }) => {
  const banner = page.getByRole('region', { name: 'Disclaimer' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('For informational and educational purposes only.');

  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Disclaimer' })).toHaveCount(0);
});

test('shows the warranty notice under the Results heading, with no dismiss', async ({ page }) => {
  const notice = page.locator('#results-heading + [role="note"]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('No warranty.');
  await expect(notice).toContainText('provided "AS IS" and "AS AVAILABLE,"');
  await expect(notice.getByRole('button')).toHaveCount(0);
});

test('the footer shows the copyright and links to the source code', async ({ page }) => {
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('Copyright © 2026 Oliver Gorwits');
  await expect(footer.getByRole('link', { name: 'Source code' })).toHaveAttribute(
    'href',
    'https://github.com/shared-amortization-calculator/shared-amortization-calculator',
  );
  await expect(footer.getByRole('link', { name: 'AGPL-3.0' })).toHaveAttribute(
    'href',
    'https://www.gnu.org/licenses/agpl-3.0.html',
  );
});

test('the currency selector changes displayed amounts', async ({ page }) => {
  const currency = page.getByRole('combobox', { name: 'Currency' });
  await expect(currency).toHaveValue('GBP');

  await currency.selectOption('EUR');
  await expect(page.getByTestId('monthly-payment')).toHaveText('€1,500.75');
  await page.getByRole('button', { name: 'Show data table for Loan balance over time' }).click();
  await expect(page.getByRole('table', { name: 'Loan balance by year' })).toContainText('€270,000.00');

  await currency.selectOption('USD');
  await expect(page.getByTestId('monthly-payment')).toHaveText('$1,500.75');
});

test('the skip link moves focus to the results', async ({ page }) => {
  const skip = page.getByRole('link', { name: 'Skip to results' });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeFocused();
});

test('serves the money-with-wings favicon', async ({ page, request }) => {
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('type', 'image/svg+xml');
  const href = await icon.evaluate((el: HTMLLinkElement) => el.href);
  const response = await request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
});
