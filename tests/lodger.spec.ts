import { test, expect, type Page } from '@playwright/test';

// Default scenario: £1,500.75 a month, two people at 50/50.
test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const tickLodger = (page: Page, term = 'lodger') =>
  page.getByRole('checkbox', { name: `We have a ${term}` }).check();
const rent = (page: Page) => page.getByRole('spinbutton', { name: 'Rent per month', exact: true });
const months = (page: Page) => page.getByRole('spinbutton', { name: 'Rent paid for (exact value)' });
const paymentSplit = (page: Page) => page.getByRole('group', { name: 'Monthly payment split' });

test('the lodger box starts unticked with no rent fields', async ({ page }) => {
  await expect(page.getByRole('checkbox', { name: 'We have a lodger' })).not.toBeChecked();
  await expect(rent(page)).toHaveCount(0);
});

test('ticking the box shows the rent fields with their defaults', async ({ page }) => {
  await tickLodger(page);
  await expect(rent(page)).toHaveValue('500');
  await expect(months(page)).toHaveValue('60');
  await expect(page.getByRole('group', { name: 'Lodger', exact: true })).toContainText('60 months (5 years)');
});

test('the split shows both periods', async ({ page }) => {
  await tickLodger(page);
  const split = paymentSplit(page);
  await expect(split).toContainText('Person 2 share: 50% (£500.37 months 1–60, then £750.37, the remainder)');
  await expect(split).toContainText('months 1–60 · then £750.37');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share amount' })).toHaveValue('500.37');
});

test('rent for the whole loan has no then part', async ({ page }) => {
  await tickLodger(page);
  await months(page).fill('300');
  const split = paymentSplit(page);
  await expect(split).toContainText('(£500.37 while the lodger pays, the remainder)');
  await expect(split).not.toContainText('then');
});

test('rent covering the whole payment leaves nothing to split', async ({ page }) => {
  await tickLodger(page);
  await rent(page).fill('2000');
  const split = paymentSplit(page);
  await expect(split).toContainText('Person 2 share: 50% (£0.00 months 1–60, then £750.37, the remainder)');
  await split.getByRole('spinbutton', { name: 'Person 1 share amount' }).fill('100');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' })).toHaveValue('50');
});

test("unticking restores today's split and keeps the values", async ({ page }) => {
  await tickLodger(page);
  await rent(page).fill('600');
  await page.getByRole('checkbox', { name: 'We have a lodger' }).uncheck();
  await expect(paymentSplit(page)).toContainText('Person 2 share: 50% (£750.37, the remainder)');
  await tickLodger(page);
  await expect(rent(page)).toHaveValue('600');
});

test('the lodger is kept in the link and cleared by Reset', async ({ page }) => {
  await tickLodger(page);
  await expect(page).toHaveURL(/lodger=1/);
  await page.reload();
  const box = page.getByRole('checkbox', { name: 'We have a lodger' });
  await expect(box).toBeChecked();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(box).not.toBeChecked();
  expect(new URL(page.url()).search).toBe('');
});

test('US dollars say roommate', async ({ page }) => {
  await page.getByLabel('Currency').selectOption('USD');
  await tickLodger(page, 'roommate');
  await expect(page.getByRole('group', { name: 'Roommate', exact: true })).toBeVisible();
  await months(page).fill('300');
  await expect(paymentSplit(page)).toContainText('while the roommate pays');
});
