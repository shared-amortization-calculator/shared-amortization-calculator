import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('initial page has no WCAG violations', async ({ page }) => {
  await expectNoViolations(page);
});

test('three people in fixed-share mode has no WCAG violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByRole('radio', { name: 'Fixed ownership shares', exact: true }).check();
  await expectNoViolations(page);
});

test('open data tables have no WCAG violations', async ({ page }) => {
  for (const title of ['Equity over time', 'Loan balance over time', 'Paid in versus equity']) {
    await page.getByRole('button', { name: `Show data table for ${title}` }).click();
  }
  await expectNoViolations(page);
});

test('arrow keys change a slider', async ({ page }) => {
  const rate = page.getByRole('slider', { name: 'Interest rate', exact: true });
  await rate.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('spinbutton', { name: 'Interest rate (exact value)', exact: true })).toHaveValue('4.55');
  await expect(page.getByTestId('monthly-payment')).not.toHaveText('£1,500.75');
});

test('focused controls show a 3px outline', async ({ page }) => {
  // No pointer interaction has happened, so programmatic focus matches :focus-visible.
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  await dismiss.focus();
  const outline = await dismiss.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline).toEqual({ style: 'solid', width: '3px' });
});

test('interactive targets are at least 44px tall', async ({ page }) => {
  await page.getByRole('button', { name: 'Show data table for Equity over time' }).click();
  const heights = await page
    .locator('button, select, input:not([type="radio"]), .radio-option label')
    .evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ height: el.getBoundingClientRect().height, html: el.outerHTML.slice(0, 80) })),
    );
  for (const { height, html } of heights) {
    expect(height, html).toBeGreaterThanOrEqual(44);
  }
});

test('reflows at 320px without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});

// Recharts animates a chart's entrance by widening clip-path rectangles; the area path itself is static.
async function chartAnimatesAfterLoad(page: Page): Promise<boolean> {
  const figure = page.getByRole('figure', { name: 'Equity over time' });
  await expect(figure.locator('.recharts-area-area').first()).toBeVisible();
  const clipWidths = () =>
    figure.locator('clipPath rect').evaluateAll((rects) => rects.map((r) => r.getAttribute('width')).join(','));
  const before = await clipWidths();
  await page.waitForTimeout(150);
  const after = await clipWidths();
  return before !== after;
}

test('charts animate by default', async ({ page }) => {
  await page.reload();
  expect(await chartAnimatesAfterLoad(page)).toBe(true);
});

test('reduced motion disables chart animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  expect(await chartAnimatesAfterLoad(page)).toBe(false);
});
