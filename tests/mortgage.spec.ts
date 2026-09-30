import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('shows headline figures for the default mortgage', async ({ page }) => {
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  await expect(page.getByTestId('total-interest')).toHaveText('£180,224.31');
  await expect(page.getByTestId('payoff')).toHaveText('Year 25, month 12');
});

test('shows the deposit and loan amounts', async ({ page }) => {
  await expect(page.getByText('£30,000 deposit, £270,000 loan')).toBeVisible();
});

test('typing a deposit amount sets the deposit percentage', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Deposit amount' }).fill('60000');
  await expect(page.getByRole('spinbutton', { name: 'Deposit (exact value)' })).toHaveValue('20');
  await expect(page.getByText('£60,000 deposit, £240,000 loan')).toBeVisible();
});

test('changing the deposit percentage updates the deposit amount', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Deposit (exact value)' }).fill('25');
  await expect(page.getByRole('spinbutton', { name: 'Deposit amount' })).toHaveValue('75000');
});

test('a deposit amount above the maximum is capped at 99.5 percent', async ({ page }) => {
  const amount = page.getByRole('spinbutton', { name: 'Deposit amount' });
  await amount.fill('400000');
  await amount.blur();
  await expect(amount).toHaveValue('298500');
  await expect(page.getByRole('spinbutton', { name: 'Deposit (exact value)' })).toHaveValue('99.5');
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
  const price = page.getByRole('spinbutton', { name: 'Home price', exact: true });
  await price.fill('');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
  await price.blur();
  await expect(price).toHaveValue('300000');
});

test('home price is a text box without a slider', async ({ page }) => {
  await expect(page.getByRole('slider', { name: /home price/i })).toHaveCount(0);
  await page.getByRole('spinbutton', { name: 'Home price', exact: true }).fill('3000000');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£15,007.48');
});

test('fees added to the loan sit next to the home price', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const price = await page.getByRole('spinbutton', { name: 'Home price', exact: true }).boundingBox();
  const fees = await page.getByRole('spinbutton', { name: 'Fees added to loan', exact: true }).boundingBox();
  expect(fees!.y).toBeCloseTo(price!.y, 0);
  expect(fees!.x).toBeGreaterThan(price!.x + price!.width);
});

test('fees added to the loan increase the loan and the payment', async ({ page }) => {
  const fees = page.getByRole('spinbutton', { name: 'Fees added to loan', exact: true });
  await expect(fees).toHaveValue('0');
  await fees.fill('1000');
  await expect(page.getByText('£30,000 deposit, £271,000 loan')).toBeVisible();
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,506.31');
});

test('negative fees are clamped to zero', async ({ page }) => {
  const fees = page.getByRole('spinbutton', { name: 'Fees added to loan', exact: true });
  await fees.fill('-500');
  await fees.blur();
  await expect(fees).toHaveValue('0');
  await expect(page.getByTestId('monthly-payment')).toHaveText('£1,500.75');
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

test('uses deposit for pounds, euros and Australian dollars and down payment for US dollars', async ({ page }) => {
  const currency = page.getByRole('combobox', { name: 'Currency' });
  const expectTerm = async (label: string, lower: string, symbol: string) => {
    await expect(page.getByRole('slider', { name: label, exact: true })).toBeVisible();
    await expect(page.getByText(`${symbol}30,000 ${lower}, ${symbol}270,000 loan`)).toBeVisible();
    await expect(page.getByRole('group', { name: `${label} split` })).toBeVisible();
    await expect(page.getByRole('radio', { name: `${label}, plus principal each person repays` })).toBeVisible();
    await expect(page.getByRole('radio', { name: `${label} preserved, remaining loan split by fixed shares` })).toBeVisible();
    await expect(page.getByText(`Each person owns their ${lower}. The loan repaid`)).toBeVisible();
  };

  await expectTerm('Deposit', 'deposit', '£');
  await currency.selectOption('USD');
  await expectTerm('Down payment', 'down payment', '$');
  await expect(page.getByText(/deposit/i)).toHaveCount(0);
  await currency.selectOption('EUR');
  await expectTerm('Deposit', 'deposit', '€');
  await expect(page.getByText(/down payment/i)).toHaveCount(0);
  await currency.selectOption('AUD');
  await expectTerm('Deposit', 'deposit', '$');
  await expect(page.getByText(/down payment/i)).toHaveCount(0);
});
