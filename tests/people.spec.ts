import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const personCards = (page: import('@playwright/test').Page) =>
  page.getByRole('group', { name: /^Person \d$/ });

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
  await expect(page.getByRole('group', { name: 'Down payment split' })).toContainText('Person 1: 100%');
});

test('the last person gets the remainder of a split', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Down payment split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }).fill('70');
  await expect(split).toContainText('Person 2 share: 30% (the remainder)');
});

test('a split cannot exceed 100%', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  const split = page.getByRole('group', { name: 'Monthly payment split' });
  const first = split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' });
  await first.fill('80');
  await first.blur();
  await expect(first).toHaveValue('66.67');
  await expect(split).toContainText('Person 3 share: 0% (the remainder)');
});

test('adding a person resets splits to equal shares', async ({ page }) => {
  const split = page.getByRole('group', { name: 'Down payment split' });
  await split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }).fill('70');
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(split.getByRole('spinbutton', { name: 'Person 1 share (exact value)' })).toHaveValue('33.33');
  await expect(split).toContainText('Person 3 share: 33.3% (the remainder)');
});

test('renaming a person updates labels, and a blank name falls back', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Name (person 1)' });
  await name.fill('Alex');
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Down payment split' }).getByRole('slider', { name: 'Alex share' })).toBeVisible();
  await name.fill('');
  await expect(page.getByRole('heading', { name: 'Person 1', exact: true })).toBeVisible();
});

test('an overpayment shortens the mortgage', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Person 1: overpayment per month (exact value)' }).fill('200');
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

  await page.getByRole('radio', { name: 'Deposit locked in, remaining loan split by fixed shares' }).check();
  await expect(principal).toBeVisible();
  await expect(ownership).toHaveCount(0);
});

test('adding a person moves focus to their name field', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page.getByRole('textbox', { name: 'Name (person 3)' })).toBeFocused();
});

test('focus moves to the new name field every time a person is added', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByRole('button', { name: 'Remove Person 3' }).click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page.getByRole('textbox', { name: 'Name (person 3)' })).toBeFocused();
});
