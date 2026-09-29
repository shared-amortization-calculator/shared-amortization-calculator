import { test, expect, type Locator, type Page } from '@playwright/test';

// Each slider that has both a percentage box and an amount box.
function pairedBoxes(page: Page): [string, Locator, Locator][] {
  const deposit = page.getByRole('group', { name: 'Deposit split' });
  const monthly = page.getByRole('group', { name: 'Monthly payment split' });
  return [
    [
      'Deposit',
      page.getByRole('spinbutton', { name: 'Deposit (exact value)' }),
      page.getByRole('spinbutton', { name: 'Deposit amount' }),
    ],
    [
      'Deposit split',
      deposit.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }),
      deposit.getByRole('spinbutton', { name: 'Person 1 share amount' }),
    ],
    [
      'Monthly payment split',
      monthly.getByRole('spinbutton', { name: 'Person 1 share (exact value)' }),
      monthly.getByRole('spinbutton', { name: 'Person 1 share amount' }),
    ],
  ];
}

test('on a portrait phone the amount box sits under the percentage box, right aligned', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  for (const [name, percent, amount] of pairedBoxes(page)) {
    const p = (await percent.boundingBox())!;
    const a = (await amount.boundingBox())!;
    expect(a.y, name).toBeGreaterThanOrEqual(p.y + p.height);
    expect(Math.abs(a.x + a.width - (p.x + p.width)), name).toBeLessThanOrEqual(1);
    expect(Math.abs(a.width - p.width), name).toBeLessThanOrEqual(1);
  }
});

test('on a wide screen the amount box stays beside the percentage box', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  for (const [name, percent, amount] of pairedBoxes(page)) {
    const p = (await percent.boundingBox())!;
    const a = (await amount.boundingBox())!;
    expect(Math.abs(a.y - p.y), name).toBeLessThanOrEqual(1);
    expect(a.x, name).toBeGreaterThan(p.x + p.width);
  }
});
