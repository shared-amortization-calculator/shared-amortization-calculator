import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const personCards = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: /^Person \d$/ });

const personCard = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('group', { name, exact: true });

test('starts with two people and allows up to three', async ({ page }) => {
  await expect(personCards(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(personCards(page)).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Add person' })).toHaveCount(0);
});

test('removing a person moves focus to the People heading', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove Person 2' }).click();
  await expect(personCards(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Remove/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeFocused();
  await expect(page.getByRole('group', { name: 'Deposit split' })).toContainText('Person 1: 100%');
});

test('the last person gets the remainder of a split', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Deposit split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }).fill('70');
  await expect(split).toContainText('Person 2 share: 30% (£9,000.00, the remainder)');
});

test('a split cannot exceed 100%', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  const split = page.getByRole('group', { name: 'Monthly payment split' });
  const first = split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' });
  await first.fill('80');
  await first.blur();
  await expect(first).toHaveValue('66.67');
  await expect(split).toContainText('Person 3 share: 0% (£0.00, the remainder)');
});

test('adding a person resets splits to equal shares', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Deposit split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }).fill('70');
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' })).toHaveValue('33.33');
  await expect(split).toContainText('Person 3 share: 33.3% (£10,000.00, the remainder)');
});

test('typing a deposit amount sets the share', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Deposit split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share amount' }).fill('7500');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' })).toHaveValue('25');
  await expect(split).toContainText('Person 2 share: 75% (£22,500.00, the remainder)');
});

test('typing a share percentage updates its amount', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Monthly payment split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }).fill('25');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share amount' })).toHaveValue('375.19');
  await expect(split).toContainText('Person 2 share: 75% (£1,125.56, the remainder)');
});

test('a split amount follows its total and keeps the percentage', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Deposit split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share amount' }).fill('7500');
  await page.getByRole('spinbutton', { name: 'Home price', exact: true }).fill('400000');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share amount' })).toHaveValue('10000');
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' })).toHaveValue('25');
});

test('a split amount cannot exceed the total', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Deposit split' });
  const amount = split.getByRole('spinbutton', { name: 'Person 1 share amount' });
  await amount.fill('45000');
  await amount.blur();
  await expect(amount).toHaveValue('30000');
  await expect(split).toContainText('Person 2 share: 0% (£0.00, the remainder)');
});

test('overpayment per month is a text box without a slider', async ({ page }) => {
  const card = personCard(page, 'Person 1');
  await expect(card.getByRole('spinbutton', { name: 'Overpayment per month', exact: true })).toBeVisible();
  await expect(card.getByRole('slider', { name: 'Overpayment per month' })).toHaveCount(0);
});

test('renaming a person updates labels, and a blank name falls back', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Name', exact: true }).first();
  await name.fill('Alex');
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Deposit split' }).getByRole('slider', { name: 'Alex share' })).toBeVisible();
  await name.fill('');
  await expect(page.getByRole('heading', { name: 'Person 1', exact: true })).toBeVisible();
});

test('an overpayment shortens the mortgage', async ({ page }) => {
  await personCard(page, 'Person 1').getByRole('spinbutton', { name: 'Overpayment per month', exact: true }).fill('200');
  await expect(page.getByTestId('payoff')).toHaveText('Year 21, month 2');
  await expect(page.getByTestId('total-interest')).toHaveText('£141,068.97');
});

test('mode-specific splits appear only for their mode', async ({ page }) => {
  const ownership = page.getByRole('group', { name: 'Ownership shares' });
  const principal = page.getByRole('group', { name: 'Split of loan repaid' });
  await expect(page.getByRole('radio', { name: 'Proportional to money paid in' })).toBeChecked();
  await expect(ownership).toHaveCount(0);
  await expect(principal).toHaveCount(0);

  await page.getByRole('radio', { name: 'Fixed ownership shares', exact: true }).check();
  await expect(ownership).toBeVisible();
  await expect(principal).toHaveCount(0);

  await page.getByRole('radio', { name: 'Deposit preserved, remaining loan split by fixed shares' }).check();
  await expect(principal).toBeVisible();
  await expect(ownership).toHaveCount(0);
});

test('adding a person moves focus to their name field', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(personCard(page, 'Person 3').getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
});

test('focus moves to the new name field every time a person is added', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByRole('button', { name: 'Remove Person 3' }).click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(personCard(page, 'Person 3').getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
});

test('person card fields are labelled without repeating the person', async ({ page }) => {
  const card = personCard(page, 'Person 2');
  await expect(card.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await expect(card.getByRole('spinbutton', { name: 'Overpayment per month', exact: true })).toBeVisible();
  await expect(card.getByRole('slider', { name: 'Overpayments start in month', exact: true })).toBeVisible();
  await expect(card.getByText(/Person 2:|\(person 2\)/)).toHaveCount(0);
});
