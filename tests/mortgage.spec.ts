import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('shows headline figures for the default mortgage', async ({ page }) => {
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  await expect(page.getByTestId('total-interest')).toHaveText('£180,224.31');
  await expect(page.getByTestId('payoff')).toHaveText('Year 25, month 12');
});

test('shows the deposit and loan amounts for the down payment', async ({ page }) => {
  await expect(page.getByText('£30,000 deposit, £270,000 loan')).toBeVisible();
});

test('changing the term updates the payoff month', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Term (exact value)', exact: true }).fill('20');
  await expect(page.getByTestId('payoff')).toHaveText('Year 20, month 12');
});

test('moving the interest rate slider updates the results', async ({ page }) => {
  await page.getByRole('slider', { name: 'Interest rate', exact: true }).fill('0');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£900.00');
  await expect(page.getByTestId('total-interest')).toHaveText('£0.00');
  await expect(page.getByRole('spinbutton', { name: 'Interest rate (exact value)', exact: true })).toHaveValue('0');
});

test('clearing a number field keeps the last valid result', async ({ page }) => {
  const price = page.getByRole('spinbutton', { name: 'Home price (exact value)', exact: true });
  await price.fill('');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  await price.blur();
  await expect(price).toHaveValue('300000');
});

test('a home price above the slider range is accepted', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Home price (exact value)', exact: true }).fill('3000000');
  await expect(page.getByRole('slider', { name: 'Home price', exact: true })).toHaveValue('2000000');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£15,007.48');
});

test('negative values are clamped to the minimum', async ({ page }) => {
  const rate = page.getByRole('spinbutton', { name: 'Interest rate (exact value)', exact: true });
  await rate.fill('-3');
  await rate.blur();
  await expect(rate).toHaveValue('0');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£900.00');
});

test('interest rate and term are capped at their slider maximums', async ({ page }) => {
  const rate = page.getByRole('spinbutton', { name: 'Interest rate (exact value)', exact: true });
  await rate.fill('99');
  await rate.blur();
  await expect(rate).toHaveValue('15');

  const term = page.getByRole('spinbutton', { name: 'Term (exact value)', exact: true });
  await term.fill('400');
  await term.blur();
  await expect(term).toHaveValue('40');
  await expect(page.getByTestId('payoff')).toHaveText('Year 40, month 12');
});
