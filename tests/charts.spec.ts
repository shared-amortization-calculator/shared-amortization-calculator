import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const FIGURES = ['Equity over time', 'Loan balance over time', 'Paid in versus equity'];

test('renders the three charts with text summaries', async ({ page }) => {
  for (const name of FIGURES) {
    const figure = page.getByRole('figure', { name });
    await expect(figure).toBeVisible();
    await expect(figure.locator('.recharts-wrapper')).toBeVisible();
  }
  await expect(page.getByRole('figure', { name: 'Equity over time' }).locator('.chart')).toHaveAccessibleName(
    /^Stacked area chart of each person's equity from the start to Year 25, month 12\./,
  );
});

test('each chart has a data table toggle', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Show data table for Equity over time' });
  const table = page.getByRole('table', { name: 'Equity by year' });
  await expect(table).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(table).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide data table for Equity over time' })).toHaveAttribute('aria-expanded', 'true');
  await expect(table.getByRole('rowheader', { name: 'Start' })).toBeVisible();
  await expect(table.getByRole('rowheader', { name: 'Year 25, month 12' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Total' })).toBeVisible();
});

test('the balance table ends at zero', async ({ page }) => {
  await page.getByRole('button', { name: 'Show data table for Loan balance over time' }).click();
  const table = page.getByRole('table', { name: 'Loan balance by year' });
  await expect(table.getByRole('row', { name: /Start/ })).toContainText('£270,000.00');
  await expect(table.getByRole('row', { name: /Year 25, month 12/ })).toContainText('£0.00');
});

test('the paid-in table has a column pair per person', async ({ page }) => {
  await page.getByRole('button', { name: 'Show data table for Paid in versus equity' }).click();
  const table = page.getByRole('table', { name: 'Paid in and equity by year' });
  for (const header of ['Person 1 paid in', 'Person 1 equity', 'Person 2 paid in', 'Person 2 equity']) {
    await expect(table.getByRole('columnheader', { name: header })).toBeVisible();
  }
});
