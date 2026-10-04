import { test, expect, type Page } from '@playwright/test';

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 375, height: 700 };

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
}

test('the end-of-loan figures sit under the headline figures, not in the Paid in versus equity chart', async ({
  page,
}) => {
  const results = page.locator('#results');
  const payoff = await page.getByTestId('payoff').textContent();
  await expect(results.getByTestId('repaid-end-heading')).toHaveText(`When the loan is repaid (${payoff})`);
  await expect(results.getByTestId('repaid-end-0')).toContainText('Paid in £');
  await expect(results.getByTestId('repaid-end-0')).toContainText('Equity £');

  const headline = (await results.locator('.headline').boundingBox())!;
  const repaid = (await results.getByTestId('repaid-end-heading').boundingBox())!;
  const chartTitle = (await page.getByText('Paid in versus equity', { exact: true }).boundingBox())!;
  expect(repaid.y).toBeGreaterThan(headline.y + headline.height - 1);
  expect(chartTitle.y).toBeGreaterThan(repaid.y);

  await expect(page.getByRole('figure', { name: 'Paid in versus equity' }).locator('.end-stats')).toHaveCount(0);
});

test('keeping results in view pins the figures while editing the form', async ({ page }) => {
  await page.setViewportSize(WIDE);
  const pin = page.getByRole('checkbox', { name: 'Keep results in view' });
  await expect(pin).not.toBeChecked();

  await scrollToTop(page);
  await expect(page.getByTestId('monthly-payment')).not.toBeInViewport();

  await pin.check();
  await scrollToTop(page);
  await expect(page.getByTestId('monthly-payment')).toBeInViewport();
  await expect(page.getByTestId('repaid-end-0')).toBeInViewport();

  const before = await page.getByTestId('monthly-payment').textContent();
  await page.getByRole('spinbutton', { name: 'Interest rate (exact value)' }).fill('6');
  await expect(page.getByTestId('monthly-payment')).not.toHaveText(before!);
  await expect(page.getByTestId('monthly-payment')).toBeInViewport();
});

test('the pinned panel does not cover the charts once scrolled past', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.getByRole('checkbox', { name: 'Keep results in view' }).check();
  await page.getByText('Loan balance over time', { exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('monthly-payment')).not.toBeInViewport();
});

test('keeping results in view is remembered after a reload', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.getByRole('checkbox', { name: 'Keep results in view' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Keep results in view' })).toBeChecked();
  await scrollToTop(page);
  await expect(page.getByTestId('monthly-payment')).toBeInViewport();
});

test('phones get a jump-to-results link instead of the checkbox', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await expect(page.getByRole('checkbox', { name: 'Keep results in view' })).toBeHidden();

  const jump = page.getByRole('link', { name: 'Jump to results' });
  await expect(jump).toBeInViewport();
  await jump.click();
  const warranty = page.getByRole('note').filter({ hasText: 'No warranty.' });
  await expect(warranty).toBeInViewport();
  await expect(warranty).toBeFocused();
  expect((await warranty.boundingBox())!.y).toBeLessThan(20);
  await expect(jump).toBeHidden();

  await scrollToTop(page);
  await expect(jump).toBeVisible();
});

test('a pinned choice made on a wide screen does not pin on a phone', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.getByRole('checkbox', { name: 'Keep results in view' }).check();
  await page.setViewportSize(PHONE);
  await scrollToTop(page);
  await expect(page.getByTestId('monthly-payment')).not.toBeInViewport();
});

test('wide screens do not show the jump-to-results link', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await scrollToTop(page);
  await expect(page.getByRole('link', { name: 'Jump to results' })).toBeHidden();
});
