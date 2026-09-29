import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const FIGURES = ['Paid in versus equity', 'Equity over time', 'Loan balance over time'];

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

test('shows paid in versus equity first', async ({ page }) => {
  await expect(page.locator('figure > figcaption')).toHaveText(FIGURES);
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

test('data tables handle people with the same name', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.getByRole('group', { name: 'Person 1', exact: true }).getByRole('textbox', { name: 'Name', exact: true }).fill('Sam');
  await page.getByRole('group', { name: 'Person 2', exact: true }).getByRole('textbox', { name: 'Name', exact: true }).fill('Sam');
  await page.getByRole('button', { name: 'Show data table for Equity over time' }).click();
  await expect(page.getByRole('table', { name: 'Equity by year' }).getByRole('columnheader', { name: 'Sam' })).toHaveCount(2);
  expect(errors.filter((e) => e.includes('same key'))).toEqual([]);
});

async function expectNoLabelOverlap(page: Page, name: string, count: number) {
  const figure = page.getByRole('figure', { name });
  await expect(figure.locator('.end-label')).toHaveCount(count);
  const boxes = await figure.locator('.end-label').evaluateAll((els) =>
    els.map((el) => {
      // getBBox measures the glyphs alone; Firefox also counts the halo stroke in getBoundingClientRect.
      const r = (el as SVGTextElement).getBBox();
      return { left: r.x, right: r.x + r.width, top: r.y, bottom: r.y + r.height, text: el.textContent };
    }),
  );
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      const overlap =
        boxes[a].left < boxes[b].right && boxes[b].left < boxes[a].right &&
        boxes[a].top < boxes[b].bottom && boxes[b].top < boxes[a].bottom;
      expect(overlap, `${boxes[a].text} overlaps ${boxes[b].text}`).toBe(false);
    }
  }
}

test('paid-in chart labels do not overlap when people contribute equally', async ({ page }) => {
  await expectNoLabelOverlap(page, 'Paid in versus equity', 4);
});

test('chart labels do not overlap for three people when one overpays', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByRole('spinbutton', { name: 'Overpayment per month' }).first().fill('500');
  await expectNoLabelOverlap(page, 'Paid in versus equity', 6);
  await expectNoLabelOverlap(page, 'Equity over time', 3);
});

test('paid-in chart legend shows dashed icons for paid in and solid icons for equity', async ({ page }) => {
  const legend = page.getByRole('figure', { name: 'Paid in versus equity' }).locator('.recharts-legend-wrapper');
  const paidIn = legend.locator('.recharts-legend-item', { hasText: 'paid in' });
  const equity = legend.locator('.recharts-legend-item', { hasText: 'equity' });
  await expect(paidIn).toHaveCount(2);
  await expect(equity).toHaveCount(2);
  for (const item of await paidIn.all()) {
    await expect(item.locator('svg line')).toHaveAttribute('stroke-dasharray', '6 4');
  }
  for (const item of await equity.all()) {
    await expect(item.locator('svg line')).toHaveCount(1);
    await expect(item.locator('svg line')).not.toHaveAttribute('stroke-dasharray', /./);
  }
});

test('paid-in chart draws lines without point markers', async ({ page }) => {
  const figure = page.getByRole('figure', { name: 'Paid in versus equity' });
  await expect(figure.locator('.recharts-line')).toHaveCount(4);
  await expect(figure.locator('.recharts-line-dots')).toHaveCount(0);
  await expect(figure.locator('.recharts-line-dot')).toHaveCount(0);
});
