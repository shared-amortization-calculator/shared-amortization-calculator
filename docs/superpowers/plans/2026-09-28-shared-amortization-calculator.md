# Shared Amortization Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only React single-page app that models a fixed-rate mortgage shared by 1–3 people, attributes equity under four selectable rules, charts the results, and deploys to GitHub Pages at WCAG 2.2 AAA.

**Architecture:** A pure TypeScript calculation engine (`src/calc/`) turns a `MortgageInputs` object into a month-by-month `ScheduleResult`. React holds one `AppState` object in `useState`, derives the schedule with `useMemo`, and renders native-element controls (slider + number pairs), headline figures in a live region, and three Recharts charts, each with a data-table alternative.

**Tech Stack:** Vite, React 19, TypeScript 5.9, Recharts 3, Vitest (unit), Playwright + `@axe-core/playwright` (end-to-end and accessibility), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-28-shared-amortization-calculator-design.md`

## Global Constraints

- Everything runs in the browser. No network requests, analytics, or server code. The only stored value is `localStorage["disclaimerDismissed"] = "true"`.
- Vite `base` is `/shared-amortization-calculator/`. Local URLs are `http://localhost:5173/shared-amortization-calculator/`.
- 1–3 people. Share fractions are 0–1 in the engine and shown as percentages in the UI; each split always sums to 1.
- Engine uses full floating-point precision; round only when displaying. A balance below `0.005` counts as paid off.
- Currencies: GBP (default, locale `en-GB`), USD (`en-US`), EUR (`en-IE`). Display formatting only — no conversion.
- WCAG 2.2 AAA: text contrast ≥ 7:1 (≥ 4.5:1 for large text); focus indicator ≥ 2px and ≥ 3:1; interactive targets ≥ 44×44 CSS px; native form elements only (no custom ARIA widgets); no horizontal scroll at 320 CSS px; chart animation off under `prefers-reduced-motion`.
- Use only the colours defined in `src/styles.css` and `src/components/charts/theme.ts`. Any new colour must be checked for 7:1 against its background.
- Runtime dependencies are limited to `react`, `react-dom`, `recharts`.
- Unit tests live in `src/**/*.test.ts` (Vitest). End-to-end tests live in `tests/*.spec.ts` (Playwright).
- `package.json` license is `AGPL-3.0-only`.
- Commit messages are short imperative sentences (repo style: "Add Playwright testing framework and initial test cases") and end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A number field cleared or mid-edit** (user deletes the home price to retype it) — results keep showing the last valid figures, never `NaN`, and the field restores the current value on blur. Pinned in Task 6 (`clearing a number field keeps the last valid result`).
2. **Floating-point residue at the end of the term** — a standard loan pays off in exactly `termYears × 12` months with no phantom extra month. Pinned in Task 2 (`pays off in exactly the term with no extra month`).
3. **Zero down payment in the proportional mode** — month 0 has zero total contributions; equity must be 0 for everyone, not `NaN`. Pinned in Task 3 (`handles a zero down payment without NaN`).
4. **Overpayments larger than the remaining balance**, including clearing the whole loan in month 1 — the loan ends that month, the balance never goes negative, and each person's applied overpayment is cut back pro rata. Pinned in Task 2 (`caps overpayments pro rata in the final month`, `clears the loan in month 1 when the overpayment exceeds it`).
5. **A typed value beyond the slider's range** (home price £3,000,000) — the typed value is used in the results and the slider sits at its maximum. Pinned in Task 6 (`a home price above the slider range is accepted`).

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Build and test tooling |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Page composition and the single `AppState` |
| `src/styles.css` | All styling and colour tokens |
| `src/calc/types.ts` | Engine types (from spec §4.1) |
| `src/calc/amortization.ts` | Loan maths: payment, balance, interest, overpayments |
| `src/calc/equityModes.ts` | Four equity attribution strategies |
| `src/calc/index.ts` | `computeSchedule` — joins loan schedule and equity |
| `src/calc/fixtures.ts` | Test builders shared by the engine tests |
| `src/format.ts` | Currency, month and percent formatting |
| `src/state/splits.ts` | Split maths: equal shares, set one share with remainder |
| `src/state/appState.ts` | `AppState`, defaults, add/remove/update person, conversion to `MortgageInputs` |
| `src/hooks/useAmortizationSchedule.ts` | `useMemo` wrapper around `computeSchedule` |
| `src/hooks/usePrefersReducedMotion.ts` | Media-query hook |
| `src/components/SliderField.tsx` | Range + number pair |
| `src/components/SplitControl.tsx` | One split across people, last person is the remainder |
| `src/components/MortgageForm/MortgageForm.tsx` | Price, down payment, rate, term |
| `src/components/PeopleControls/PeopleControls.tsx` | Person cards, add/remove, down payment and payment splits |
| `src/components/EquityModeSelector/EquityModeSelector.tsx` | Mode radios and mode-specific splits |
| `src/components/Results/Results.tsx` | Headline figures in a live region |
| `src/components/charts/*` | Theme, data shaping, figure wrapper, data table, three charts |
| `src/components/DisclaimerBanner.tsx`, `Footer.tsx`, `CurrencySelector.tsx` | Page chrome |
| `tests/*.spec.ts` | Playwright end-to-end and accessibility tests |
| `.github/workflows/deploy.yml` | Build and publish to GitHub Pages |

---

### Task 1: Project scaffold

**Files:**
- Modify: `package.json`, `.gitignore`, `playwright.config.ts`
- Create: `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `tests/smoke.spec.ts`
- Delete: `tests/example.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run dev` (Vite on port 5173 at base `/shared-amortization-calculator/`), `npm run build`, `npm test` (Vitest, `src/**/*.test.ts`), `npm run test:e2e` (Playwright). `src/App.tsx` default export `App`. CSS classes listed in `src/styles.css` used by later tasks.

- [ ] **Step 1: Update `package.json` and install dependencies**

```bash
npm pkg delete main
npm pkg set type=module license=AGPL-3.0-only
npm pkg set private=true --json
npm pkg set scripts.dev=vite "scripts.build=tsc && vite build" "scripts.preview=vite preview" "scripts.test=vitest run" "scripts.test:e2e=playwright test"
npm install react react-dom
npm install -D vite @vitejs/plugin-react "typescript@~5.9" vitest @types/react @types/react-dom
```

TypeScript is pinned to 5.9 because the 7.x native compiler is new; 5.9 is the proven line for Vite + React.

- [ ] **Step 2: Add `dist/` to `.gitignore`**

Append this line to the end of `.gitignore`:

```
dist/
```

- [ ] **Step 3: Point Playwright at the Vite base path**

In `playwright.config.ts`, replace:

```ts
    baseURL: 'http://localhost:5173',
```

with:

```ts
    baseURL: 'http://localhost:5173/shared-amortization-calculator/',
```

and replace:

```ts
    url: 'http://localhost:5173', // or 3000 for CRA/Next
```

with:

```ts
    url: 'http://localhost:5173/shared-amortization-calculator/',
```

- [ ] **Step 4: Replace the example test with a failing smoke test**

```bash
git rm tests/example.spec.ts
```

Create `tests/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('loads the app', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Shared Amortization Calculator');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Shared Amortization Calculator' }),
  ).toBeVisible();
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npx playwright test tests/smoke.spec.ts --project=chromium`
Expected: FAIL — the web server cannot start because there is no `vite.config.ts` / `index.html` yet (or the page 404s).

- [ ] **Step 6: Create the Vite, TypeScript and HTML config**

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/shared-amortization-calculator/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Mortgage amortization calculator for one to three people sharing a mortgage."
    />
    <title>Shared Amortization Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Do not add `maximum-scale` or `user-scalable=no` to the viewport tag — users must be able to zoom.

- [ ] **Step 7: Create the React entry, a minimal App, and the stylesheet**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <>
      <header className="site-header page">
        <h1 id="app-title">Shared Amortization Calculator</h1>
      </header>
      <main id="main" className="page" />
    </>
  );
}
```

`src/styles.css` (the full stylesheet; later tasks use these classes and must not add colours outside these tokens):

```css
:root {
  --text: #1a1a1a;
  --muted: #3b3b3b;
  --bg: #ffffff;
  --surface: #f4f4f2;
  --border: #595959;
  --accent: #0b3d91;
  --accent-contrast: #ffffff;
  --banner-bg: #fff4d6;
  --focus: #0b3d91;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 100%;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.page {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1rem;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
}

.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 10;
  padding: 0.75rem 1rem;
  background: var(--bg);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

a {
  color: var(--accent);
}

button {
  font: inherit;
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
  border: 2px solid var(--accent);
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-contrast);
  cursor: pointer;
}

button.secondary {
  background: var(--bg);
  color: var(--accent);
}

input,
select {
  font: inherit;
  color: var(--text);
}

input[type="number"],
input[type="text"],
select {
  min-height: 44px;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
}

input[type="range"] {
  width: 100%;
  min-height: 44px;
  margin: 0;
  accent-color: var(--accent);
}

fieldset {
  min-width: 0;
  margin: 0 0 1rem;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 4px;
}

legend {
  padding: 0 0.25rem;
  font-weight: 700;
}

section {
  margin-block: 2rem;
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.site-header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.currency-select {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.banner {
  margin-top: 1rem;
  background: var(--banner-bg);
  border: 2px solid var(--text);
  border-radius: 4px;
}

.banner__title {
  margin-top: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.slider-field {
  margin-bottom: 1rem;
}

.slider-field label {
  display: block;
  font-weight: 600;
}

.slider-field__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.slider-field__number {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.slider-field__number input {
  width: 9rem;
  max-width: 40vw;
}

.slider-field__hint {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

.people {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  margin-bottom: 1rem;
}

.person-card {
  padding: 1rem;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 4px;
}

.person-card h3 {
  margin-top: 0;
}

.text-field {
  margin-bottom: 1rem;
}

.text-field label {
  display: block;
  font-weight: 600;
}

.text-field input {
  width: 100%;
}

.radio-option {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.radio-option input {
  flex: none;
  width: 24px;
  height: 24px;
  margin-top: 10px;
}

.radio-option label {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
}

.radio-option p {
  margin: 0;
  color: var(--muted);
}

.headline {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  margin: 0 0 2rem;
}

.headline div {
  padding: 1rem;
  background: var(--surface);
  border-radius: 4px;
}

.headline dt {
  font-weight: 600;
}

.headline dd {
  margin: 0;
  font-size: 1.5rem;
}

figure {
  margin: 0 0 2rem;
}

figcaption {
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.chart {
  width: 100%;
  height: 320px;
  margin-bottom: 0.5rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  margin-top: 0.5rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  text-align: right;
}

th[scope="row"],
thead th:first-child,
caption {
  text-align: left;
}

caption {
  font-weight: 600;
}

.site-footer {
  margin-top: 3rem;
  border-top: 2px solid var(--border);
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 8: Run the smoke test and the build**

Run: `npx playwright test tests/smoke.spec.ts --project=chromium`
Expected: PASS (1 test).

Run: `npm run build`
Expected: exits 0 and writes `dist/index.html`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore playwright.config.ts vite.config.ts tsconfig.json index.html src tests
git commit -m "Scaffold Vite React TypeScript app with Vitest and Playwright" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Engine types and loan schedule

**Files:**
- Create: `src/calc/types.ts`, `src/calc/fixtures.ts`, `src/calc/amortization.ts`
- Test: `src/calc/amortization.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (`src/calc/types.ts`): `PersonId`, `Person`, `EquityMode`, `MortgageInputs`, `PersonMonth`, `ScheduleRow`, `ScheduleResult` exactly as below.
- Produces (`src/calc/amortization.ts`): `PAID_OFF_THRESHOLD = 0.005`; `monthlyPayment(loanAmount: number, annualRatePercent: number, termYears: number): number`; `interface LoanMonth`; `interface LoanSchedule { loanAmount; monthlyPayment; months: LoanMonth[] }`; `buildLoanSchedule(inputs: MortgageInputs): LoanSchedule`. `LoanMonth.appliedOverpayments[k]` is person `k`'s applied overpayment, in `inputs.people` order. `months` does not include month 0.
- Produces (`src/calc/fixtures.ts`): `makePerson(overrides?: Partial<Person>): Person`, `makeInputs(overrides?: Partial<MortgageInputs>): MortgageInputs`.

- [ ] **Step 1: Create the types**

`src/calc/types.ts`:

```ts
export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  downPaymentShare: number;
  paymentShare: number;
  ownershipShare: number;
  principalShare: number;
  overpaymentMonthly: number;
  overpaymentStartMonth: number;
}

export type EquityMode = 'proportional' | 'fixed' | 'depositBaseline' | 'lockedDeposit';

export interface MortgageInputs {
  homePrice: number;
  downPayment: number;
  annualRatePercent: number;
  termYears: number;
  people: Person[];
  equityMode: EquityMode;
}

export interface PersonMonth {
  personId: PersonId;
  paidThisMonth: number;
  cumulativeContributed: number;
  equity: number;
}

export interface ScheduleRow {
  month: number;
  openingBalance: number;
  interest: number;
  regularPrincipal: number;
  overpaymentPrincipal: number;
  closingBalance: number;
  totalEquity: number;
  people: PersonMonth[];
}

export interface ScheduleResult {
  monthlyPayment: number;
  totalInterest: number;
  payoffMonth: number;
  rows: ScheduleRow[];
}
```

- [ ] **Step 2: Create the test fixtures**

`src/calc/fixtures.ts`:

```ts
import type { MortgageInputs, Person } from './types';

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    name: 'Person 1',
    downPaymentShare: 1,
    paymentShare: 1,
    ownershipShare: 1,
    principalShare: 1,
    overpaymentMonthly: 0,
    overpaymentStartMonth: 1,
    ...overrides,
  };
}

export function makeInputs(overrides: Partial<MortgageInputs> = {}): MortgageInputs {
  return {
    homePrice: 125000,
    downPayment: 25000,
    annualRatePercent: 6,
    termYears: 30,
    people: [makePerson()],
    equityMode: 'proportional',
    ...overrides,
  };
}
```

The default is a £100,000 loan at 6% over 30 years: a textbook case with a £599.55 payment and £115,838.19 total interest.

- [ ] **Step 3: Write the failing tests**

`src/calc/amortization.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildLoanSchedule, monthlyPayment, PAID_OFF_THRESHOLD } from './amortization';
import { makeInputs, makePerson } from './fixtures';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

// £1,200 loan at 0% over 1 year: £100 a month, easy to check by hand.
const smallZeroRateLoan = { homePrice: 1500, downPayment: 300, annualRatePercent: 0, termYears: 1 };

describe('monthlyPayment', () => {
  it('matches textbook values', () => {
    expect(monthlyPayment(100000, 6, 30)).toBeCloseTo(599.55, 2);
    expect(monthlyPayment(200000, 5, 30)).toBeCloseTo(1073.64, 2);
    expect(monthlyPayment(270000, 4.5, 25)).toBeCloseTo(1500.75, 2);
  });

  it('divides evenly at 0%', () => {
    expect(monthlyPayment(120000, 0, 10)).toBe(1000);
  });
});

describe('buildLoanSchedule', () => {
  it('splits the first payment into interest and principal', () => {
    const schedule = buildLoanSchedule(makeInputs());
    const first = schedule.months[0];
    expect(schedule.loanAmount).toBe(100000);
    expect(first.month).toBe(1);
    expect(first.openingBalance).toBe(100000);
    expect(first.interest).toBeCloseTo(500, 6);
    expect(first.regularPrincipal).toBeCloseTo(99.550525, 5);
    expect(first.closingBalance).toBeCloseTo(99900.449475, 5);
    expect(first.regularPayment).toBeCloseTo(599.550525, 5);
  });

  it('matches textbook total interest', () => {
    const schedule = buildLoanSchedule(makeInputs());
    expect(schedule.months).toHaveLength(360);
    expect(sum(schedule.months.map((m) => m.interest))).toBeCloseTo(115838.19, 2);
    expect(schedule.months[359].closingBalance).toBeLessThan(PAID_OFF_THRESHOLD);
  });

  it('pays off in exactly the term with no extra month', () => {
    const schedule = buildLoanSchedule(
      makeInputs({ homePrice: 300000, downPayment: 30000, annualRatePercent: 4.5, termYears: 25 }),
    );
    expect(schedule.months).toHaveLength(300);
    expect(sum(schedule.months.map((m) => m.interest))).toBeCloseTo(180224.31, 2);
  });

  it('repays the same principal every month at 0%', () => {
    const schedule = buildLoanSchedule(
      makeInputs({ homePrice: 120000, downPayment: 0, annualRatePercent: 0, termYears: 10 }),
    );
    expect(schedule.months).toHaveLength(120);
    for (const m of schedule.months) {
      expect(m.interest).toBe(0);
      expect(m.regularPrincipal).toBeCloseTo(1000, 9);
    }
  });

  it('shortens the term with a recurring overpayment from month 1', () => {
    const schedule = buildLoanSchedule(
      makeInputs({ people: [makePerson({ overpaymentMonthly: 100, overpaymentStartMonth: 1 })] }),
    );
    expect(schedule.months).toHaveLength(252);
    expect(sum(schedule.months.map((m) => m.interest))).toBeCloseTo(75937.94, 2);
    expect(schedule.months[0].overpaymentPrincipal).toBe(100);
    expect(schedule.months[0].appliedOverpayments).toEqual([100]);
  });

  it('starts overpayments in the chosen month', () => {
    const schedule = buildLoanSchedule(
      makeInputs({ people: [makePerson({ overpaymentMonthly: 100, overpaymentStartMonth: 13 })] }),
    );
    expect(schedule.months[11].overpaymentPrincipal).toBe(0);
    expect(schedule.months[12].overpaymentPrincipal).toBe(100);
    expect(schedule.months.length).toBeLessThan(360);
  });

  it('caps overpayments pro rata in the final month', () => {
    const schedule = buildLoanSchedule(
      makeInputs({
        ...smallZeroRateLoan,
        people: [
          makePerson({ id: 'a', overpaymentMonthly: 150 }),
          makePerson({ id: 'b', overpaymentMonthly: 100 }),
        ],
      }),
    );
    // 1200 → 850 → 500 → 150; month 4 has £50 left after the regular £100.
    expect(schedule.months).toHaveLength(4);
    const last = schedule.months[3];
    expect(last.regularPrincipal).toBe(100);
    expect(last.overpaymentPrincipal).toBeCloseTo(50, 9);
    expect(last.appliedOverpayments[0]).toBeCloseTo(30, 9);
    expect(last.appliedOverpayments[1]).toBeCloseTo(20, 9);
    expect(last.closingBalance).toBeCloseTo(0, 9);
  });

  it('clears the loan in month 1 when the overpayment exceeds it', () => {
    const schedule = buildLoanSchedule(
      makeInputs({ ...smallZeroRateLoan, people: [makePerson({ overpaymentMonthly: 5000 })] }),
    );
    expect(schedule.months).toHaveLength(1);
    expect(schedule.months[0].overpaymentPrincipal).toBeCloseTo(1100, 9);
    expect(schedule.months[0].appliedOverpayments[0]).toBeCloseTo(1100, 9);
    expect(schedule.months[0].closingBalance).toBeCloseTo(0, 9);
  });

  it('returns no months when there is no loan', () => {
    const schedule = buildLoanSchedule(makeInputs({ homePrice: 1000, downPayment: 1000 }));
    expect(schedule.loanAmount).toBe(0);
    expect(schedule.monthlyPayment).toBe(0);
    expect(schedule.months).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- src/calc/amortization.test.ts`
Expected: FAIL — `Failed to resolve import "./amortization"`.

- [ ] **Step 5: Implement the loan schedule**

`src/calc/amortization.ts`:

```ts
import type { MortgageInputs } from './types';

export const PAID_OFF_THRESHOLD = 0.005;

export interface LoanMonth {
  month: number;
  openingBalance: number;
  interest: number;
  regularPrincipal: number;
  overpaymentPrincipal: number;
  closingBalance: number;
  regularPayment: number;
  appliedOverpayments: number[];
}

export interface LoanSchedule {
  loanAmount: number;
  monthlyPayment: number;
  months: LoanMonth[];
}

export function monthlyPayment(loanAmount: number, annualRatePercent: number, termYears: number): number {
  const n = termYears * 12;
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return loanAmount / n;
  return (loanAmount * i) / (1 - Math.pow(1 + i, -n));
}

export function buildLoanSchedule(inputs: MortgageInputs): LoanSchedule {
  const loanAmount = inputs.homePrice - inputs.downPayment;
  const payment = monthlyPayment(loanAmount, inputs.annualRatePercent, inputs.termYears);
  const i = inputs.annualRatePercent / 100 / 12;
  const months: LoanMonth[] = [];
  let balance = loanAmount;
  let month = 0;

  while (balance >= PAID_OFF_THRESHOLD) {
    month += 1;
    const interest = balance * i;
    const regularPrincipal = Math.min(payment - interest, balance);
    const remaining = balance - regularPrincipal;
    const offered = inputs.people.map((p) =>
      month >= p.overpaymentStartMonth ? p.overpaymentMonthly : 0,
    );
    const totalOffered = offered.reduce((a, b) => a + b, 0);
    const overpaymentPrincipal = Math.min(totalOffered, remaining);
    const scale = totalOffered > 0 ? overpaymentPrincipal / totalOffered : 0;
    const closingBalance = remaining - overpaymentPrincipal;

    months.push({
      month,
      openingBalance: balance,
      interest,
      regularPrincipal,
      overpaymentPrincipal,
      closingBalance,
      regularPayment: interest + regularPrincipal,
      appliedOverpayments: offered.map((o) => o * scale),
    });
    balance = closingBalance;
  }

  return { loanAmount, monthlyPayment: payment, months };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/calc/amortization.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 7: Commit**

```bash
git add src/calc
git commit -m "Add loan amortization schedule with recurring overpayments" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Equity modes and `computeSchedule`

**Files:**
- Create: `src/calc/equityModes.ts`, `src/calc/index.ts`
- Test: `src/calc/equityModes.test.ts`, `src/calc/computeSchedule.test.ts`

**Interfaces:**
- Consumes: `buildLoanSchedule`, `LoanMonth` (Task 2); types from `src/calc/types.ts`; `makePerson`, `makeInputs` (Task 2).
- Produces (`src/calc/equityModes.ts`): `interface EquityInput { people; downPayment; totalEquity; principalRepaid; cumulativeContributed: number[]; cumulativePrincipalPaid: number[] }`, `type EquityStrategy = (input: EquityInput) => number[]`, `equityStrategies: Record<EquityMode, EquityStrategy>`.
- Produces (`src/calc/index.ts`): `computeSchedule(inputs: MortgageInputs): ScheduleResult`. `rows[0]` is month 0 (the opening position); `rows[k].people` is in `inputs.people` order; `payoffMonth === rows.length - 1`.

- [ ] **Step 1: Write the failing strategy tests**

`src/calc/equityModes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { equityStrategies, type EquityInput } from './equityModes';
import { makePerson } from './fixtures';

const input: EquityInput = {
  people: [
    makePerson({ id: 'a', downPaymentShare: 0.5, ownershipShare: 0.7, principalShare: 0.25 }),
    makePerson({ id: 'b', downPaymentShare: 0.5, ownershipShare: 0.3, principalShare: 0.75 }),
  ],
  downPayment: 100,
  totalEquity: 400,
  principalRepaid: 300,
  cumulativeContributed: [600, 200],
  cumulativePrincipalPaid: [200, 100],
};

describe('equityStrategies', () => {
  it('proportional: total equity split by money paid in', () => {
    expect(equityStrategies.proportional(input)).toEqual([300, 100]);
  });

  it('proportional: equal split when nobody has paid anything', () => {
    const result = equityStrategies.proportional({
      ...input,
      totalEquity: 0,
      cumulativeContributed: [0, 0],
    });
    expect(result).toEqual([0, 0]);
  });

  it('fixed: total equity split by ownership shares', () => {
    const [a, b] = equityStrategies.fixed(input);
    expect(a).toBeCloseTo(280, 9);
    expect(b).toBeCloseTo(120, 9);
  });

  it('depositBaseline: own deposit plus own principal', () => {
    expect(equityStrategies.depositBaseline(input)).toEqual([250, 150]);
  });

  it('lockedDeposit: own deposit plus fixed share of principal repaid', () => {
    expect(equityStrategies.lockedDeposit(input)).toEqual([125, 275]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/calc/equityModes.test.ts`
Expected: FAIL — `Failed to resolve import "./equityModes"`.

- [ ] **Step 3: Implement the strategies**

`src/calc/equityModes.ts`:

```ts
import type { EquityMode, Person } from './types';

export interface EquityInput {
  people: Person[];
  downPayment: number;
  totalEquity: number;
  principalRepaid: number;
  cumulativeContributed: number[];
  cumulativePrincipalPaid: number[];
}

export type EquityStrategy = (input: EquityInput) => number[];

const proportional: EquityStrategy = ({ people, totalEquity, cumulativeContributed }) => {
  const total = cumulativeContributed.reduce((a, b) => a + b, 0);
  if (total === 0) return people.map(() => totalEquity / people.length);
  return cumulativeContributed.map((c) => (totalEquity * c) / total);
};

const fixed: EquityStrategy = ({ people, totalEquity }) =>
  people.map((p) => totalEquity * p.ownershipShare);

const depositBaseline: EquityStrategy = ({ people, downPayment, cumulativePrincipalPaid }) =>
  people.map((p, k) => downPayment * p.downPaymentShare + cumulativePrincipalPaid[k]);

const lockedDeposit: EquityStrategy = ({ people, downPayment, principalRepaid }) =>
  people.map((p) => downPayment * p.downPaymentShare + principalRepaid * p.principalShare);

export const equityStrategies: Record<EquityMode, EquityStrategy> = {
  proportional,
  fixed,
  depositBaseline,
  lockedDeposit,
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/calc/equityModes.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing `computeSchedule` tests**

`src/calc/computeSchedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeSchedule } from './index';
import { makeInputs, makePerson } from './fixtures';
import type { EquityMode, MortgageInputs } from './types';

const MODES: EquityMode[] = ['proportional', 'fixed', 'depositBaseline', 'lockedDeposit'];

// £1,500 home, £300 deposit (A £200, B £100), £1,200 loan at 0% over 1 year = £100/month.
// A pays 75% of each payment, B 25%.
function handCase(equityMode: EquityMode): MortgageInputs {
  return makeInputs({
    homePrice: 1500,
    downPayment: 300,
    annualRatePercent: 0,
    termYears: 1,
    equityMode,
    people: [
      makePerson({ id: 'a', downPaymentShare: 2 / 3, paymentShare: 0.75, ownershipShare: 0.5, principalShare: 0.4 }),
      makePerson({ id: 'b', downPaymentShare: 1 / 3, paymentShare: 0.25, ownershipShare: 0.5, principalShare: 0.6 }),
    ],
  });
}

function equities(inputs: MortgageInputs, month: number): number[] {
  return computeSchedule(inputs).rows[month].people.map((p) => p.equity);
}

describe('computeSchedule', () => {
  it('starts with a month 0 row holding the deposit', () => {
    const result = computeSchedule(handCase('proportional'));
    const opening = result.rows[0];
    expect(opening.month).toBe(0);
    expect(opening.closingBalance).toBe(1200);
    expect(opening.totalEquity).toBe(300);
    expect(opening.people.map((p) => p.cumulativeContributed)).toEqual([200, 100]);
    expect(opening.people.map((p) => p.paidThisMonth)).toEqual([0, 0]);
  });

  it('reports payment, interest and payoff month', () => {
    const result = computeSchedule(makeInputs());
    expect(result.monthlyPayment).toBeCloseTo(599.55, 2);
    expect(result.totalInterest).toBeCloseTo(115838.19, 2);
    expect(result.payoffMonth).toBe(360);
    expect(result.rows).toHaveLength(361);
  });

  it('tracks what each person pays', () => {
    const result = computeSchedule(handCase('proportional'));
    expect(result.rows[1].people.map((p) => p.paidThisMonth)).toEqual([75, 25]);
    const final = result.rows[12].people.map((p) => p.cumulativeContributed);
    expect(final[0]).toBeCloseTo(1100, 9);
    expect(final[1]).toBeCloseTo(400, 9);
  });

  it('proportional mode matches the hand calculation', () => {
    const month6 = equities(handCase('proportional'), 6);
    expect(month6[0]).toBeCloseTo(650, 9);
    expect(month6[1]).toBeCloseTo(250, 9);
    const month12 = equities(handCase('proportional'), 12);
    expect(month12[0]).toBeCloseTo(1100, 9);
    expect(month12[1]).toBeCloseTo(400, 9);
  });

  it('fixed mode matches the hand calculation', () => {
    const month12 = equities(handCase('fixed'), 12);
    expect(month12[0]).toBeCloseTo(750, 9);
    expect(month12[1]).toBeCloseTo(750, 9);
  });

  it('depositBaseline mode matches the hand calculation', () => {
    const month12 = equities(handCase('depositBaseline'), 12);
    expect(month12[0]).toBeCloseTo(1100, 9);
    expect(month12[1]).toBeCloseTo(400, 9);
  });

  it('lockedDeposit mode matches the hand calculation', () => {
    const month12 = equities(handCase('lockedDeposit'), 12);
    expect(month12[0]).toBeCloseTo(680, 9);
    expect(month12[1]).toBeCloseTo(820, 9);
  });

  it('proportional counts interest but depositBaseline does not', () => {
    // B paid half the deposit and nothing since; A pays every monthly payment (with interest).
    const people = [
      makePerson({ id: 'a', downPaymentShare: 0.5, paymentShare: 1 }),
      makePerson({ id: 'b', downPaymentShare: 0.5, paymentShare: 0 }),
    ];
    const baseline = equities(makeInputs({ people, equityMode: 'depositBaseline' }), 12);
    const proportional = equities(makeInputs({ people, equityMode: 'proportional' }), 12);
    expect(baseline[1]).toBeCloseTo(12500, 6);
    expect(proportional[1]).toBeLessThan(12500);
  });

  it('handles a zero down payment without NaN', () => {
    const result = computeSchedule(
      makeInputs({
        downPayment: 0,
        homePrice: 100000,
        people: [makePerson({ id: 'a', paymentShare: 0.5 }), makePerson({ id: 'b', paymentShare: 0.5 })],
      }),
    );
    expect(result.rows[0].people.map((p) => p.equity)).toEqual([0, 0]);
    for (const row of result.rows) {
      for (const p of row.people) expect(Number.isFinite(p.equity)).toBe(true);
    }
  });

  it('returns only the opening row when there is no loan', () => {
    const result = computeSchedule(makeInputs({ homePrice: 1000, downPayment: 1000 }));
    expect(result.payoffMonth).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].people[0].equity).toBe(1000);
  });

  it.each(MODES)('%s: equity always sums to total equity with three people', (equityMode) => {
    const result = computeSchedule(
      makeInputs({
        homePrice: 400000,
        downPayment: 60000,
        annualRatePercent: 5,
        termYears: 25,
        equityMode,
        people: [
          makePerson({ id: 'a', downPaymentShare: 0.5, paymentShare: 0.2, ownershipShare: 0.4, principalShare: 0.1 }),
          makePerson({ id: 'b', downPaymentShare: 0.3, paymentShare: 0.5, ownershipShare: 0.4, principalShare: 0.6, overpaymentMonthly: 150, overpaymentStartMonth: 13 }),
          makePerson({ id: 'c', downPaymentShare: 0.2, paymentShare: 0.3, ownershipShare: 0.2, principalShare: 0.3, overpaymentMonthly: 300, overpaymentStartMonth: 60 }),
        ],
      }),
    );
    for (const row of result.rows) {
      const total = row.people.reduce((a, p) => a + p.equity, 0);
      expect(total).toBeCloseTo(row.totalEquity, 4);
    }
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- src/calc/computeSchedule.test.ts`
Expected: FAIL — `Failed to resolve import "./index"`.

- [ ] **Step 7: Implement `computeSchedule`**

`src/calc/index.ts`:

```ts
import { buildLoanSchedule } from './amortization';
import { equityStrategies } from './equityModes';
import type { MortgageInputs, ScheduleResult, ScheduleRow } from './types';

type LoanFields = Omit<ScheduleRow, 'totalEquity' | 'people'>;

export function computeSchedule(inputs: MortgageInputs): ScheduleResult {
  const { people, downPayment, homePrice } = inputs;
  const strategy = equityStrategies[inputs.equityMode];
  const loan = buildLoanSchedule(inputs);
  const contributed = people.map((p) => downPayment * p.downPaymentShare);
  const principalPaid = people.map(() => 0);

  const makeRow = (fields: LoanFields, paid: number[]): ScheduleRow => {
    const totalEquity = homePrice - fields.closingBalance;
    const equity = strategy({
      people,
      downPayment,
      totalEquity,
      principalRepaid: loan.loanAmount - fields.closingBalance,
      cumulativeContributed: [...contributed],
      cumulativePrincipalPaid: [...principalPaid],
    });
    return {
      ...fields,
      totalEquity,
      people: people.map((p, k) => ({
        personId: p.id,
        paidThisMonth: paid[k],
        cumulativeContributed: contributed[k],
        equity: equity[k],
      })),
    };
  };

  const rows: ScheduleRow[] = [
    makeRow(
      {
        month: 0,
        openingBalance: loan.loanAmount,
        interest: 0,
        regularPrincipal: 0,
        overpaymentPrincipal: 0,
        closingBalance: loan.loanAmount,
      },
      people.map(() => 0),
    ),
  ];

  let totalInterest = 0;
  for (const m of loan.months) {
    totalInterest += m.interest;
    const paid = people.map((p, k) => p.paymentShare * m.regularPayment + m.appliedOverpayments[k]);
    people.forEach((p, k) => {
      contributed[k] += paid[k];
      principalPaid[k] += p.paymentShare * m.regularPrincipal + m.appliedOverpayments[k];
    });
    rows.push(
      makeRow(
        {
          month: m.month,
          openingBalance: m.openingBalance,
          interest: m.interest,
          regularPrincipal: m.regularPrincipal,
          overpaymentPrincipal: m.overpaymentPrincipal,
          closingBalance: m.closingBalance,
        },
        paid,
      ),
    );
  }

  return {
    monthlyPayment: loan.monthlyPayment,
    totalInterest,
    payoffMonth: loan.months.length,
    rows,
  };
}
```

- [ ] **Step 8: Run all unit tests**

Run: `npm test`
Expected: PASS (all tests in `amortization.test.ts`, `equityModes.test.ts`, `computeSchedule.test.ts`).

- [ ] **Step 9: Commit**

```bash
git add src/calc
git commit -m "Add four equity attribution modes and computeSchedule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Formatting helpers

**Files:**
- Create: `src/format.ts`
- Test: `src/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type CurrencyCode = 'GBP' | 'USD' | 'EUR'`; `CURRENCIES: { code: CurrencyCode; label: string; locale: string }[]`; `formatCurrency(value: number, currency: CurrencyCode, options?: { whole?: boolean; compact?: boolean }): string`; `currencySymbol(currency: CurrencyCode): string`; `formatMonth(month: number): string`; `formatPercent(fraction: number): string`.

- [ ] **Step 1: Write the failing tests**

`src/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { currencySymbol, formatCurrency, formatMonth, formatPercent } from './format';

describe('formatCurrency', () => {
  it('formats pounds, dollars and euros to the penny', () => {
    expect(formatCurrency(1500.74769, 'GBP')).toBe('£1,500.75');
    expect(formatCurrency(1500.74769, 'USD')).toBe('$1,500.75');
    expect(formatCurrency(1500.74769, 'EUR')).toBe('€1,500.75');
  });

  it('formats whole amounts without pennies', () => {
    expect(formatCurrency(300000, 'GBP', { whole: true })).toBe('£300,000');
  });

  it('never shows negative zero from floating-point residue', () => {
    expect(formatCurrency(-0.000001, 'GBP')).toBe('£0.00');
  });

  it('formats compact axis labels with the symbol', () => {
    expect(formatCurrency(300000, 'GBP', { compact: true })).toMatch(/^£300\s?K$/);
  });
});

describe('currencySymbol', () => {
  it('returns the symbol for each currency', () => {
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
  });
});

describe('formatMonth', () => {
  it('labels month 0 as the start', () => {
    expect(formatMonth(0)).toBe('Start');
  });

  it('labels months by year and month within the year', () => {
    expect(formatMonth(1)).toBe('Year 1, month 1');
    expect(formatMonth(12)).toBe('Year 1, month 12');
    expect(formatMonth(13)).toBe('Year 2, month 1');
    expect(formatMonth(242)).toBe('Year 21, month 2');
    expect(formatMonth(300)).toBe('Year 25, month 12');
  });
});

describe('formatPercent', () => {
  it('shows up to one decimal place', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1 / 3)).toBe('33.3%');
    expect(formatPercent(0.005)).toBe('0.5%');
    expect(formatPercent(1e-16)).toBe('0%');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 3: Implement**

`src/format.ts`:

```ts
export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: 'GBP', label: '£ GBP', locale: 'en-GB' },
  { code: 'USD', label: '$ USD', locale: 'en-US' },
  { code: 'EUR', label: '€ EUR', locale: 'en-IE' },
];

function localeFor(currency: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === currency)!.locale;
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  options: { whole?: boolean; compact?: boolean } = {},
): string {
  const safe = Math.abs(value) < 0.005 ? 0 : value;
  const minimumFractionDigits = options.whole || options.compact ? 0 : 2;
  return new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency,
    notation: options.compact ? 'compact' : 'standard',
    minimumFractionDigits,
    maximumFractionDigits: options.compact ? 1 : minimumFractionDigits,
  }).format(safe);
}

export function currencySymbol(currency: CurrencyCode): string {
  return new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency')!.value;
}

export function formatMonth(month: number): string {
  if (month === 0) return 'Start';
  const year = Math.floor((month - 1) / 12) + 1;
  const monthInYear = ((month - 1) % 12) + 1;
  return `Year ${year}, month ${monthInYear}`;
}

export function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(1))}%`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/format.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/format.ts src/format.test.ts
git commit -m "Add currency, month and percent formatting" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: App state and split maths

**Files:**
- Create: `src/state/splits.ts`, `src/state/appState.ts`
- Test: `src/state/splits.test.ts`, `src/state/appState.test.ts`

**Interfaces:**
- Consumes: `Person`, `EquityMode`, `MortgageInputs` (Task 2); `CurrencyCode` (Task 4).
- Produces (`splits.ts`): `type ShareKey = 'downPaymentShare' | 'paymentShare' | 'ownershipShare' | 'principalShare'`; `equalizeShares(people: Person[]): Person[]` (sets all four keys to `1/n`); `setShare(people: Person[], key: ShareKey, index: number, fraction: number): Person[]` (clamps `people[index][key]` so non-last shares fit in 1, sets the last person to the remainder; returns `people` unchanged if `index` is the last person or out of range).
- Produces (`appState.ts`): `MAX_PEOPLE = 3`; `interface AppState { homePrice; downPaymentPercent; annualRatePercent; termYears; people: Person[]; equityMode: EquityMode; currency: CurrencyCode }`; `initialState(): AppState`; `addPerson(state): AppState`; `removePerson(state, id: string): AppState`; `updatePerson(state, id: string, patch: Partial<Person>): AppState`; `displayName(person: Person, index: number): string`; `toMortgageInputs(state): MortgageInputs`.

- [ ] **Step 1: Write the failing split tests**

`src/state/splits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makePerson } from '../calc/fixtures';
import { equalizeShares, setShare } from './splits';

function withDownShares(shares: number[]) {
  return shares.map((s, k) => makePerson({ id: `p${k + 1}`, downPaymentShare: s }));
}

const downShares = (people: ReturnType<typeof withDownShares>) => people.map((p) => p.downPaymentShare);

describe('equalizeShares', () => {
  it('gives everyone an equal share of every split', () => {
    const [a, b, c] = equalizeShares(withDownShares([0.7, 0.2, 0.1]));
    for (const p of [a, b, c]) {
      expect(p.downPaymentShare).toBeCloseTo(1 / 3, 12);
      expect(p.paymentShare).toBeCloseTo(1 / 3, 12);
      expect(p.ownershipShare).toBeCloseTo(1 / 3, 12);
      expect(p.principalShare).toBeCloseTo(1 / 3, 12);
    }
  });
});

describe('setShare', () => {
  it('sets a share and gives the remainder to the last person', () => {
    const [a, b] = downShares(setShare(withDownShares([0.5, 0.5]), 'downPaymentShare', 0, 0.7));
    expect(a).toBe(0.7);
    expect(b).toBeCloseTo(0.3, 12);
  });

  it('adjusts a middle person and recomputes the remainder', () => {
    const result = downShares(setShare(withDownShares([0.5, 0.3, 0.2]), 'downPaymentShare', 1, 0.1));
    expect(result[0]).toBe(0.5);
    expect(result[1]).toBe(0.1);
    expect(result[2]).toBeCloseTo(0.4, 12);
  });

  it('clamps so the non-last shares never exceed 100%', () => {
    const result = downShares(setShare(withDownShares([0.5, 0.3, 0.2]), 'downPaymentShare', 0, 0.8));
    expect(result[0]).toBeCloseTo(0.7, 12);
    expect(result[1]).toBe(0.3);
    expect(result[2]).toBeCloseTo(0, 12);
  });

  it('clamps negative values to zero', () => {
    expect(downShares(setShare(withDownShares([0.5, 0.5]), 'downPaymentShare', 0, -0.2))).toEqual([0, 1]);
  });

  it('ignores the last person and out-of-range indexes', () => {
    const people = withDownShares([0.5, 0.5]);
    expect(setShare(people, 'downPaymentShare', 1, 0.9)).toBe(people);
    expect(setShare(people, 'downPaymentShare', 5, 0.9)).toBe(people);
  });

  it('leaves the other splits untouched', () => {
    const people = equalizeShares(withDownShares([0.5, 0.5]));
    const result = setShare(people, 'downPaymentShare', 0, 0.9);
    expect(result.map((p) => p.paymentShare)).toEqual([0.5, 0.5]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/state/splits.test.ts`
Expected: FAIL — `Failed to resolve import "./splits"`.

- [ ] **Step 3: Implement `splits.ts`**

`src/state/splits.ts`:

```ts
import type { Person } from '../calc/types';

export type ShareKey = 'downPaymentShare' | 'paymentShare' | 'ownershipShare' | 'principalShare';

export function equalizeShares(people: Person[]): Person[] {
  const share = 1 / people.length;
  return people.map((p) => ({
    ...p,
    downPaymentShare: share,
    paymentShare: share,
    ownershipShare: share,
    principalShare: share,
  }));
}

export function setShare(people: Person[], key: ShareKey, index: number, fraction: number): Person[] {
  const last = people.length - 1;
  if (index < 0 || index >= last) return people;
  const others = people.reduce((sum, p, k) => (k === index || k === last ? sum : sum + p[key]), 0);
  const clamped = Math.min(Math.max(fraction, 0), 1 - others);
  const updated = people.map((p, k) => (k === index ? { ...p, [key]: clamped } : p));
  const nonLastTotal = updated.reduce((sum, p, k) => (k === last ? sum : sum + p[key]), 0);
  return updated.map((p, k) => (k === last ? { ...p, [key]: Math.max(0, 1 - nonLastTotal) } : p));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/state/splits.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing app-state tests**

`src/state/appState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addPerson,
  displayName,
  initialState,
  MAX_PEOPLE,
  removePerson,
  toMortgageInputs,
  updatePerson,
} from './appState';

describe('initialState', () => {
  it('starts with the spec defaults and two people sharing equally', () => {
    const state = initialState();
    expect(state).toMatchObject({
      homePrice: 300000,
      downPaymentPercent: 10,
      annualRatePercent: 4.5,
      termYears: 25,
      equityMode: 'proportional',
      currency: 'GBP',
    });
    expect(state.people.map((p) => p.name)).toEqual(['Person 1', 'Person 2']);
    expect(state.people.map((p) => p.paymentShare)).toEqual([0.5, 0.5]);
  });
});

describe('addPerson', () => {
  it('adds a person and resets every split to equal shares', () => {
    const state = addPerson(initialState());
    expect(state.people).toHaveLength(3);
    expect(state.people[2]).toMatchObject({ id: 'p3', name: 'Person 3', overpaymentMonthly: 0 });
    for (const p of state.people) expect(p.downPaymentShare).toBeCloseTo(1 / 3, 12);
  });

  it(`stops at ${MAX_PEOPLE} people`, () => {
    const three = addPerson(initialState());
    expect(addPerson(three)).toBe(three);
  });

  it('reuses a free id after a removal', () => {
    const state = addPerson(removePerson(initialState(), 'p1'));
    expect(state.people.map((p) => p.id)).toEqual(['p2', 'p1']);
  });
});

describe('removePerson', () => {
  it('removes a person and resets splits', () => {
    const state = removePerson(addPerson(initialState()), 'p2');
    expect(state.people.map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(state.people.map((p) => p.ownershipShare)).toEqual([0.5, 0.5]);
  });

  it('never removes the last person', () => {
    const one = removePerson(initialState(), 'p2');
    expect(one.people).toHaveLength(1);
    expect(one.people[0].paymentShare).toBe(1);
    expect(removePerson(one, 'p1')).toBe(one);
  });
});

describe('updatePerson', () => {
  it('patches one person only', () => {
    const state = updatePerson(initialState(), 'p2', { overpaymentMonthly: 200 });
    expect(state.people.map((p) => p.overpaymentMonthly)).toEqual([0, 200]);
  });
});

describe('displayName', () => {
  it('uses the name, falling back to the position when blank', () => {
    const [p1] = initialState().people;
    expect(displayName(p1, 0)).toBe('Person 1');
    expect(displayName({ ...p1, name: '  Alex ' }, 0)).toBe('Alex');
    expect(displayName({ ...p1, name: '   ' }, 1)).toBe('Person 2');
  });
});

describe('toMortgageInputs', () => {
  it('converts the down payment percentage to an amount', () => {
    const inputs = toMortgageInputs(initialState());
    expect(inputs.downPayment).toBe(30000);
    expect(inputs.homePrice).toBe(300000);
    expect(inputs.people).toHaveLength(2);
    expect(inputs.equityMode).toBe('proportional');
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- src/state/appState.test.ts`
Expected: FAIL — `Failed to resolve import "./appState"`.

- [ ] **Step 7: Implement `appState.ts`**

`src/state/appState.ts`:

```ts
import type { EquityMode, MortgageInputs, Person } from '../calc/types';
import type { CurrencyCode } from '../format';
import { equalizeShares } from './splits';

export const MAX_PEOPLE = 3;
const PERSON_IDS = ['p1', 'p2', 'p3'];

export interface AppState {
  homePrice: number;
  downPaymentPercent: number;
  annualRatePercent: number;
  termYears: number;
  people: Person[];
  equityMode: EquityMode;
  currency: CurrencyCode;
}

function createPerson(id: string, index: number): Person {
  return {
    id,
    name: `Person ${index + 1}`,
    downPaymentShare: 1,
    paymentShare: 1,
    ownershipShare: 1,
    principalShare: 1,
    overpaymentMonthly: 0,
    overpaymentStartMonth: 1,
  };
}

export function initialState(): AppState {
  return {
    homePrice: 300000,
    downPaymentPercent: 10,
    annualRatePercent: 4.5,
    termYears: 25,
    people: equalizeShares([createPerson('p1', 0), createPerson('p2', 1)]),
    equityMode: 'proportional',
    currency: 'GBP',
  };
}

export function addPerson(state: AppState): AppState {
  if (state.people.length >= MAX_PEOPLE) return state;
  const id = PERSON_IDS.find((candidate) => !state.people.some((p) => p.id === candidate))!;
  return {
    ...state,
    people: equalizeShares([...state.people, createPerson(id, state.people.length)]),
  };
}

export function removePerson(state: AppState, id: string): AppState {
  if (state.people.length <= 1) return state;
  return { ...state, people: equalizeShares(state.people.filter((p) => p.id !== id)) };
}

export function updatePerson(state: AppState, id: string, patch: Partial<Person>): AppState {
  return { ...state, people: state.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function displayName(person: Person, index: number): string {
  return person.name.trim() || `Person ${index + 1}`;
}

export function toMortgageInputs(state: AppState): MortgageInputs {
  return {
    homePrice: state.homePrice,
    downPayment: (state.homePrice * state.downPaymentPercent) / 100,
    annualRatePercent: state.annualRatePercent,
    termYears: state.termYears,
    people: state.people,
    equityMode: state.equityMode,
  };
}
```

- [ ] **Step 8: Run all unit tests**

Run: `npm test`
Expected: PASS (all unit test files).

- [ ] **Step 9: Commit**

```bash
git add src/state
git commit -m "Add app state and split helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Slider fields, mortgage form and headline results

**Files:**
- Create: `src/components/SliderField.tsx`, `src/components/MortgageForm/MortgageForm.tsx`, `src/components/Results/Results.tsx`, `src/hooks/useAmortizationSchedule.ts`
- Modify: `src/App.tsx`
- Test: `tests/mortgage.spec.ts`

**Interfaces:**
- Consumes: `computeSchedule` (Task 3); `ScheduleResult` (Task 2); `formatCurrency`, `currencySymbol`, `formatMonth`, `CurrencyCode` (Task 4); `AppState`, `initialState`, `toMortgageInputs` (Task 5).
- Produces:
  - `SliderField` default export with props `{ label: string; value: number; onChange: (value: number) => void; min: number; sliderMin?: number; sliderMax: number; max?: number; step: number; valueText: (value: number) => string; prefix?: string; suffix?: string; integer?: boolean; hint?: ReactNode }`. Accessible names: the range input is named `label`; the number input is named `` `${label} (exact value)` ``.
  - `useAmortizationSchedule(state: AppState): ScheduleResult`.
  - `MortgageForm` default export, props `{ state: AppState; onPatch: (patch: Partial<AppState>) => void }`.
  - `Results` default export, props `{ result: ScheduleResult; currency: CurrencyCode }`. Test ids: `monthly-payment`, `total-interest`, `payoff`.
  - In `App`, a `<section id="results" tabIndex={-1}>` that later tasks add charts to.

- [ ] **Step 1: Write the failing end-to-end tests**

`tests/mortgage.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/mortgage.spec.ts --project=chromium`
Expected: FAIL — `getByTestId('monthly-payment')` not found.

- [ ] **Step 3: Implement `SliderField`**

`src/components/SliderField.tsx`:

```tsx
import { useId, useState, type ReactNode } from 'react';

export interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  sliderMin?: number;
  sliderMax: number;
  max?: number;
  step: number;
  valueText: (value: number) => string;
  prefix?: string;
  suffix?: string;
  integer?: boolean;
  hint?: ReactNode;
}

function display(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export default function SliderField({
  label,
  value,
  onChange,
  min,
  sliderMin = min,
  sliderMax,
  max = Number.POSITIVE_INFINITY,
  step,
  valueText,
  prefix,
  suffix,
  integer = false,
  hint,
}: SliderFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const prefixId = `${id}-prefix`;
  const suffixId = `${id}-suffix`;
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, integer ? Math.round(n) : n));
  const numberDescribedBy =
    [prefix && prefixId, suffix && suffixId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="slider-field">
      <label htmlFor={id}>{label}</label>
      <div className="slider-field__controls">
        <input
          id={id}
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={Math.min(Math.max(value, sliderMin), sliderMax)}
          aria-valuetext={valueText(value)}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => {
            setDraft(null);
            onChange(clamp(Number(e.target.value)));
          }}
        />
        <span className="slider-field__number">
          {prefix && <span id={prefixId}>{prefix}</span>}
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={min}
            max={Number.isFinite(max) ? max : undefined}
            value={draft ?? display(value)}
            aria-label={`${label} (exact value)`}
            aria-describedby={numberDescribedBy}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              const parsed = Number(raw);
              if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
            }}
            onBlur={() => setDraft(null)}
          />
          {suffix && <span id={suffixId}>{suffix}</span>}
        </span>
      </div>
      {hint && (
        <p id={hintId} className="slider-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
```

The number field keeps the raw text the user typed (`draft`) and only reports parseable values upward, so an empty or half-typed field never pushes `NaN` into the schedule. On blur it shows the current value again.

- [ ] **Step 4: Implement the schedule hook**

`src/hooks/useAmortizationSchedule.ts`:

```ts
import { useMemo } from 'react';
import { computeSchedule } from '../calc';
import type { ScheduleResult } from '../calc/types';
import { toMortgageInputs, type AppState } from '../state/appState';

export function useAmortizationSchedule(state: AppState): ScheduleResult {
  return useMemo(() => computeSchedule(toMortgageInputs(state)), [state]);
}
```

- [ ] **Step 5: Implement `MortgageForm`**

`src/components/MortgageForm/MortgageForm.tsx`:

```tsx
import SliderField from '../SliderField';
import { currencySymbol, formatCurrency } from '../../format';
import type { AppState } from '../../state/appState';

interface MortgageFormProps {
  state: AppState;
  onPatch: (patch: Partial<AppState>) => void;
}

export default function MortgageForm({ state, onPatch }: MortgageFormProps) {
  const money = (value: number) => formatCurrency(value, state.currency, { whole: true });
  const deposit = (state.homePrice * state.downPaymentPercent) / 100;

  return (
    <section aria-labelledby="mortgage-heading">
      <h2 id="mortgage-heading">Mortgage</h2>
      <SliderField
        label="Home price"
        value={state.homePrice}
        min={0}
        sliderMin={50000}
        sliderMax={2000000}
        step={5000}
        prefix={currencySymbol(state.currency)}
        valueText={money}
        onChange={(homePrice) => onPatch({ homePrice })}
      />
      <SliderField
        label="Down payment"
        value={state.downPaymentPercent}
        min={0}
        sliderMax={99.5}
        max={99.5}
        step={0.5}
        suffix="%"
        valueText={(v) => `${v} percent, ${money((state.homePrice * v) / 100)}`}
        hint={`${money(deposit)} deposit, ${money(state.homePrice - deposit)} loan`}
        onChange={(downPaymentPercent) => onPatch({ downPaymentPercent })}
      />
      <SliderField
        label="Interest rate"
        value={state.annualRatePercent}
        min={0}
        sliderMax={15}
        step={0.05}
        suffix="% a year"
        valueText={(v) => `${v} percent a year`}
        onChange={(annualRatePercent) => onPatch({ annualRatePercent })}
      />
      <SliderField
        label="Term"
        value={state.termYears}
        min={1}
        sliderMax={40}
        step={1}
        integer
        suffix="years"
        valueText={(v) => `${v} years`}
        onChange={(termYears) => onPatch({ termYears })}
      />
    </section>
  );
}
```

- [ ] **Step 6: Implement `Results`**

`src/components/Results/Results.tsx`:

```tsx
import type { ScheduleResult } from '../../calc/types';
import { formatCurrency, formatMonth, type CurrencyCode } from '../../format';

interface ResultsProps {
  result: ScheduleResult;
  currency: CurrencyCode;
}

export default function Results({ result, currency }: ResultsProps) {
  return (
    <div aria-live="polite" aria-atomic="true">
      <dl className="headline">
        <div>
          <dt>Monthly payment</dt>
          <dd data-testid="monthly-payment">{formatCurrency(result.monthlyPayment, currency)}</dd>
        </div>
        <div>
          <dt>Total interest</dt>
          <dd data-testid="total-interest">{formatCurrency(result.totalInterest, currency)}</dd>
        </div>
        <div>
          <dt>Paid off</dt>
          <dd data-testid="payoff">{formatMonth(result.payoffMonth)}</dd>
        </div>
      </dl>
    </div>
  );
}
```

- [ ] **Step 7: Wire them into `App`**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import MortgageForm from './components/MortgageForm/MortgageForm';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

  return (
    <>
      <header className="site-header page">
        <h1 id="app-title">Shared Amortization Calculator</h1>
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 8: Run the tests**

Run: `npx playwright test tests/mortgage.spec.ts tests/smoke.spec.ts --project=chromium`
Expected: PASS (8 tests).

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src tests/mortgage.spec.ts
git commit -m "Add mortgage form with slider fields and headline results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: People, splits and equity mode

**Files:**
- Create: `src/components/SplitControl.tsx`, `src/components/PeopleControls/PeopleControls.tsx`, `src/components/EquityModeSelector/EquityModeSelector.tsx`
- Modify: `src/App.tsx`
- Test: `tests/people.spec.ts`

**Interfaces:**
- Consumes: `SliderField` (Task 6); `setShare`, `ShareKey` (Task 5); `AppState`, `MAX_PEOPLE`, `addPerson`, `removePerson`, `updatePerson`, `displayName` (Task 5); `formatCurrency`, `currencySymbol`, `formatMonth`, `formatPercent` (Task 4); `Person`, `EquityMode` (Task 2).
- Produces:
  - `SplitControl` default export, props `{ legend: string; people: Person[]; shareKey: ShareKey; onChange: (people: Person[]) => void }`. Renders a `fieldset` named `legend`; each non-last person's slider is named `` `${name} share` ``; the last person is the text `` `${name} share: ${percent} (the remainder)` ``.
  - `PeopleControls` default export, props `{ state: AppState; update: (fn: (s: AppState) => AppState) => void }`. Per person: text input named `` `Name (person ${index + 1})` ``, sliders `` `${name}: overpayment per month` `` and `` `${name}: overpayments start in month` ``, button `` `Remove ${name}` ``. Buttons "Add person". Split fieldsets "Down payment split" and "Monthly payment split".
  - `EquityModeSelector` default export, same props. Radios named "Proportional to money paid in", "Fixed ownership shares", "Deposit, plus principal each person repays", "Deposit locked in, remaining loan split by fixed shares". Split fieldsets "Ownership shares" (mode `fixed` only) and "Split of loan repaid" (mode `lockedDeposit` only).

- [ ] **Step 1: Write the failing end-to-end tests**

`tests/people.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/people.spec.ts --project=chromium`
Expected: FAIL — no groups named `Person 1` / button "Add person" not found.

- [ ] **Step 3: Implement `SplitControl`**

`src/components/SplitControl.tsx`:

```tsx
import SliderField from './SliderField';
import type { Person } from '../calc/types';
import { formatPercent } from '../format';
import { displayName } from '../state/appState';
import { setShare, type ShareKey } from '../state/splits';

interface SplitControlProps {
  legend: string;
  people: Person[];
  shareKey: ShareKey;
  onChange: (people: Person[]) => void;
}

export default function SplitControl({ legend, people, shareKey, onChange }: SplitControlProps) {
  const lastIndex = people.length - 1;

  return (
    <fieldset>
      <legend>{legend}</legend>
      {people.length === 1 ? (
        <p>{displayName(people[0], 0)}: 100%</p>
      ) : (
        people.map((person, index) => {
          const name = displayName(person, index);
          if (index === lastIndex) {
            return (
              <p key={person.id}>
                {name} share: {formatPercent(person[shareKey])} (the remainder)
              </p>
            );
          }
          return (
            <SliderField
              key={person.id}
              label={`${name} share`}
              value={person[shareKey] * 100}
              min={0}
              sliderMax={100}
              max={100}
              step={1}
              suffix="%"
              valueText={(v) => `${Number(v.toFixed(1))} percent`}
              onChange={(percent) => onChange(setShare(people, shareKey, index, percent / 100))}
            />
          );
        })
      )}
    </fieldset>
  );
}
```

- [ ] **Step 4: Implement `PeopleControls`**

`src/components/PeopleControls/PeopleControls.tsx`:

```tsx
import { useRef } from 'react';
import SliderField from '../SliderField';
import SplitControl from '../SplitControl';
import type { Person } from '../../calc/types';
import { currencySymbol, formatCurrency, formatMonth } from '../../format';
import {
  addPerson,
  displayName,
  MAX_PEOPLE,
  removePerson,
  updatePerson,
  type AppState,
} from '../../state/appState';

interface PeopleControlsProps {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function PeopleControls({ state, update }: PeopleControlsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { people, currency } = state;
  const termMonths = state.termYears * 12;
  const money = (value: number) => formatCurrency(value, currency, { whole: true });
  const setPeople = (next: Person[]) => update((s) => ({ ...s, people: next }));

  return (
    <section aria-labelledby="people-heading">
      <h2 id="people-heading" ref={headingRef} tabIndex={-1}>
        People
      </h2>
      <div className="people">
        {people.map((person, index) => {
          const name = displayName(person, index);
          const headingId = `${person.id}-heading`;
          const nameId = `${person.id}-name`;
          return (
            <div key={person.id} className="person-card" role="group" aria-labelledby={headingId}>
              <h3 id={headingId}>{name}</h3>
              <div className="text-field">
                <label htmlFor={nameId}>Name (person {index + 1})</label>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="off"
                  value={person.name}
                  onChange={(e) => update((s) => updatePerson(s, person.id, { name: e.target.value }))}
                />
              </div>
              <SliderField
                label={`${name}: overpayment per month`}
                value={person.overpaymentMonthly}
                min={0}
                sliderMax={2000}
                step={10}
                prefix={currencySymbol(currency)}
                valueText={money}
                onChange={(v) => update((s) => updatePerson(s, person.id, { overpaymentMonthly: v }))}
              />
              <SliderField
                label={`${name}: overpayments start in month`}
                value={person.overpaymentStartMonth}
                min={1}
                sliderMax={termMonths}
                max={termMonths}
                step={1}
                integer
                valueText={formatMonth}
                hint={formatMonth(person.overpaymentStartMonth)}
                onChange={(v) => update((s) => updatePerson(s, person.id, { overpaymentStartMonth: v }))}
              />
              {people.length > 1 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    update((s) => removePerson(s, person.id));
                    headingRef.current?.focus();
                  }}
                >
                  Remove {name}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {people.length < MAX_PEOPLE && (
        <p>
          <button type="button" onClick={() => update(addPerson)}>
            Add person
          </button>
        </p>
      )}
      <SplitControl legend="Down payment split" people={people} shareKey="downPaymentShare" onChange={setPeople} />
      <SplitControl legend="Monthly payment split" people={people} shareKey="paymentShare" onChange={setPeople} />
    </section>
  );
}
```

- [ ] **Step 5: Implement `EquityModeSelector`**

`src/components/EquityModeSelector/EquityModeSelector.tsx`:

```tsx
import SplitControl from '../SplitControl';
import type { EquityMode, Person } from '../../calc/types';
import type { AppState } from '../../state/appState';

const MODES: { mode: EquityMode; label: string; description: string }[] = [
  {
    mode: 'proportional',
    label: 'Proportional to money paid in',
    description:
      "Each person's share of the equity matches their share of all the money paid in so far, including the deposit and interest.",
  },
  {
    mode: 'fixed',
    label: 'Fixed ownership shares',
    description: 'Equity is split by fixed shares you set, whoever pays.',
  },
  {
    mode: 'depositBaseline',
    label: 'Deposit, plus principal each person repays',
    description: 'Each person owns their deposit plus the loan they have repaid. Interest does not count.',
  },
  {
    mode: 'lockedDeposit',
    label: 'Deposit locked in, remaining loan split by fixed shares',
    description: 'Each person owns their deposit. The loan repaid is split by fixed shares you set.',
  },
];

interface EquityModeSelectorProps {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function EquityModeSelector({ state, update }: EquityModeSelectorProps) {
  const setPeople = (people: Person[]) => update((s) => ({ ...s, people }));

  return (
    <section aria-labelledby="equity-heading">
      <h2 id="equity-heading">How equity is shared</h2>
      <fieldset>
        <legend>Equity rule</legend>
        {MODES.map(({ mode, label, description }) => {
          const id = `mode-${mode}`;
          return (
            <div key={mode} className="radio-option">
              <input
                id={id}
                type="radio"
                name="equity-mode"
                value={mode}
                checked={state.equityMode === mode}
                aria-describedby={`${id}-desc`}
                onChange={() => update((s) => ({ ...s, equityMode: mode }))}
              />
              <div>
                <label htmlFor={id}>{label}</label>
                <p id={`${id}-desc`}>{description}</p>
              </div>
            </div>
          );
        })}
      </fieldset>
      {state.equityMode === 'fixed' && (
        <SplitControl legend="Ownership shares" people={state.people} shareKey="ownershipShare" onChange={setPeople} />
      )}
      {state.equityMode === 'lockedDeposit' && (
        <SplitControl legend="Split of loan repaid" people={state.people} shareKey="principalShare" onChange={setPeople} />
      )}
    </section>
  );
}
```

- [ ] **Step 6: Wire them into `App`**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

  return (
    <>
      <header className="site-header page">
        <h1 id="app-title">Shared Amortization Calculator</h1>
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx playwright test --project=chromium`
Expected: PASS (all tests in `smoke`, `mortgage`, `people` specs).

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add src tests/people.spec.ts
git commit -m "Add people controls, contribution splits and equity mode selector" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Charts and data tables

**Files:**
- Create: `src/components/charts/theme.ts`, `src/components/charts/chartData.ts`, `src/components/charts/endLabel.tsx`, `src/components/charts/ChartFigure.tsx`, `src/components/charts/DataTable.tsx`, `src/components/charts/EquityOverTime.tsx`, `src/components/charts/BalanceOverTime.tsx`, `src/components/charts/ContributedVsEquity.tsx`, `src/hooks/usePrefersReducedMotion.ts`
- Modify: `src/App.tsx`
- Test: `src/components/charts/chartData.test.ts`, `tests/charts.spec.ts`

**Interfaces:**
- Consumes: `computeSchedule` (Task 3); `ScheduleResult`, `ScheduleRow`, `Person` (Task 2); `formatCurrency`, `formatMonth`, `CurrencyCode` (Task 4); `displayName` (Task 5); `makeInputs`, `makePerson` (Task 2).
- Produces:
  - `chartData.ts`: `type ChartPoint = { month: number } & Record<string, number>`; `equityData(result): ChartPoint[]` (keys = person ids); `balanceData(result): ChartPoint[]` (key `balance`); `contributedData(result): ChartPoint[]` (keys `${id}_paid`, `${id}_equity`); `yearlyRows(result): ScheduleRow[]` (month 0, every 12th month, and the payoff month); `yearTicks(payoffMonth: number): number[]`.
  - `ChartProps` (exported from `ChartFigure.tsx`): `{ result: ScheduleResult; people: Person[]; currency: CurrencyCode; animate: boolean }`, taken by all three chart components.
  - `usePrefersReducedMotion(): boolean`.
  - Accessible names: figures "Equity over time", "Loan balance over time", "Paid in versus equity"; toggle buttons `` `Show data table for ${title}` `` / `` `Hide data table for ${title}` ``; tables "Equity by year", "Loan balance by year", "Paid in and equity by year".

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Write the failing chart-data tests**

`src/components/charts/chartData.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeSchedule } from '../../calc';
import { makeInputs, makePerson } from '../../calc/fixtures';
import { balanceData, contributedData, equityData, yearlyRows, yearTicks } from './chartData';

const result = computeSchedule(
  makeInputs({
    homePrice: 1500,
    downPayment: 300,
    annualRatePercent: 0,
    termYears: 2,
    people: [
      makePerson({ id: 'a', downPaymentShare: 2 / 3, paymentShare: 0.75 }),
      makePerson({ id: 'b', downPaymentShare: 1 / 3, paymentShare: 0.25 }),
    ],
  }),
);

describe('chart data', () => {
  it('keys equity by person id', () => {
    const point = equityData(result)[24];
    expect(point.month).toBe(24);
    expect(point.a).toBeCloseTo(1100, 9);
    expect(point.b).toBeCloseTo(400, 9);
  });

  it('exposes the closing balance', () => {
    expect(balanceData(result)[0]).toEqual({ month: 0, balance: 1200 });
    expect(balanceData(result)[24].balance).toBeCloseTo(0, 9);
  });

  it('keys paid-in and equity per person', () => {
    const point = contributedData(result)[24];
    expect(point.a_paid).toBeCloseTo(1100, 9);
    expect(point.b_paid).toBeCloseTo(400, 9);
    expect(point.a_equity).toBeCloseTo(1100, 9);
  });
});

describe('yearlyRows', () => {
  it('samples each year end and the payoff month', () => {
    expect(yearlyRows(result).map((r) => r.month)).toEqual([0, 12, 24]);
    const early = computeSchedule(
      makeInputs({ homePrice: 1500, downPayment: 300, annualRatePercent: 0, termYears: 2, people: [makePerson({ overpaymentMonthly: 40 })] }),
    );
    // £90/month against £1,200: £30 left after month 13, cleared in month 14.
    expect(early.payoffMonth).toBe(14);
    expect(yearlyRows(early).map((r) => r.month)).toEqual([0, 12, 14]);
  });
});

describe('yearTicks', () => {
  it('ticks every year for short loans', () => {
    expect(yearTicks(24)).toEqual([0, 12, 24]);
  });

  it('ticks every two years for medium loans', () => {
    expect(yearTicks(180)).toEqual([0, 24, 48, 72, 96, 120, 144, 168]);
  });

  it('ticks every five years for long loans', () => {
    expect(yearTicks(300)).toEqual([0, 60, 120, 180, 240, 300]);
    expect(yearTicks(242)).toEqual([0, 60, 120, 180, 240]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- src/components/charts/chartData.test.ts`
Expected: FAIL — `Failed to resolve import "./chartData"`.

- [ ] **Step 4: Implement `chartData.ts` and `theme.ts`**

`src/components/charts/chartData.ts`:

```ts
import type { ScheduleResult, ScheduleRow } from '../../calc/types';

export type ChartPoint = { month: number } & Record<string, number>;

export function equityData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({
    month: row.month,
    ...Object.fromEntries(row.people.map((p) => [p.personId, p.equity])),
  }));
}

export function balanceData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({ month: row.month, balance: row.closingBalance }));
}

export function contributedData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({
    month: row.month,
    ...Object.fromEntries(
      row.people.flatMap((p) => [
        [`${p.personId}_paid`, p.cumulativeContributed],
        [`${p.personId}_equity`, p.equity],
      ]),
    ),
  }));
}

export function yearlyRows(result: ScheduleResult): ScheduleRow[] {
  return result.rows.filter((row) => row.month % 12 === 0 || row.month === result.payoffMonth);
}

export function yearTicks(payoffMonth: number): number[] {
  const years = Math.ceil(payoffMonth / 12);
  const step = years > 20 ? 5 : years > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let year = 0; year <= years; year += step) {
    if (year * 12 <= payoffMonth) ticks.push(year * 12);
  }
  return ticks;
}
```

`src/components/charts/theme.ts`:

```ts
// Each colour has at least 7:1 contrast on white, so labels drawn in it meet AAA.
export const PERSON_COLORS = ['#0b3d91', '#8a3b00', '#1e5b1e'];
export const PERSON_DASHES: (string | undefined)[] = [undefined, '8 4', '2 3'];
export const PAID_IN_DASH = '6 4';
export const TEXT_COLOR = '#1a1a1a';
export const GRID_COLOR = '#767676';
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- src/components/charts/chartData.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the failing end-to-end tests**

`tests/charts.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

const FIGURES = ['Equity over time', 'Loan balance over time', 'Paid in versus equity'];

test('renders the three charts with text summaries', async ({ page }) => {
  for (const name of FIGURES) {
    const figure = page.getByRole('figure', { name });
    await expect(figure).toBeVisible();
    await expect(figure.locator('svg.recharts-surface')).toBeVisible();
  }
  await expect(page.getByRole('figure', { name: 'Equity over time' }).getByRole('img')).toHaveAccessibleName(
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
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx playwright test tests/charts.spec.ts --project=chromium`
Expected: FAIL — no figure named "Equity over time".

- [ ] **Step 8: Implement the reduced-motion hook**

`src/hooks/usePrefersReducedMotion.ts`:

```ts
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
```

- [ ] **Step 9: Implement the shared chart pieces**

`src/components/charts/endLabel.tsx`:

```tsx
interface LabelPosition {
  x?: number | string;
  y?: number | string;
  index?: number;
}

export function endLabel(text: string, lastIndex: number, color: string) {
  return function EndLabel({ x, y, index }: LabelPosition) {
    if (index !== lastIndex || x === undefined || y === undefined) return <g />;
    return (
      <text x={Number(x)} y={Number(y)} dx={-4} dy={-8} textAnchor="end" fill={color} fontSize={13} fontWeight={600}>
        {text}
      </text>
    );
  };
}
```

`src/components/charts/DataTable.tsx`:

```tsx
import type { ScheduleRow } from '../../calc/types';
import { formatMonth } from '../../format';

export interface Column {
  header: string;
  value: (row: ScheduleRow) => string;
}

interface DataTableProps {
  caption: string;
  rows: ScheduleRow[];
  columns: Column[];
}

export default function DataTable({ caption, rows, columns }: DataTableProps) {
  return (
    <div className="table-wrap" role="region" aria-label={`${caption} (scrollable)`} tabIndex={0}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            {columns.map((c) => (
              <th key={c.header} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonth(row.month)}</th>
              {columns.map((c) => (
                <td key={c.header}>{c.value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`src/components/charts/ChartFigure.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import type { Person, ScheduleResult } from '../../calc/types';
import type { CurrencyCode } from '../../format';

export interface ChartProps {
  result: ScheduleResult;
  people: Person[];
  currency: CurrencyCode;
  animate: boolean;
}

interface ChartFigureProps {
  id: string;
  title: string;
  summary: string;
  chart: ReactNode;
  table: ReactNode;
}

export default function ChartFigure({ id, title, summary, chart, table }: ChartFigureProps) {
  const [showTable, setShowTable] = useState(false);
  const captionId = `${id}-caption`;
  const tableId = `${id}-table`;

  return (
    <figure aria-labelledby={captionId}>
      <figcaption id={captionId}>{title}</figcaption>
      <div className="chart" role="img" aria-label={summary}>
        {chart}
      </div>
      <button
        type="button"
        className="secondary"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? 'Hide' : 'Show'} data table<span className="visually-hidden"> for {title}</span>
      </button>
      <div id={tableId} hidden={!showTable}>
        {table}
      </div>
    </figure>
  );
}
```

The chart is wrapped in `role="img"` with a text summary, so assistive technology treats the SVG as one image; the data table is the full text alternative. Charts are rendered with `accessibilityLayer={false}` so the SVG does not take keyboard focus inside that image.

- [ ] **Step 10: Implement the three charts**

`src/components/charts/EquityOverTime.tsx`:

```tsx
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import { displayName } from '../../state/appState';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { equityData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import { endLabel } from './endLabel';
import { GRID_COLOR, PERSON_COLORS, PERSON_DASHES, TEXT_COLOR } from './theme';

export default function EquityOverTime({ result, people, currency, animate }: ChartProps) {
  const data = equityData(result);
  const lastIndex = data.length - 1;
  const names = people.map(displayName);
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);
  const summary =
    `Stacked area chart of each person's equity from the start to ${formatMonth(result.payoffMonth)}. ` +
    `Final equity: ${names.map((n, k) => `${n} ${formatCurrency(final.people[k].equity, currency, { whole: true })}`).join(', ')}.`;

  return (
    <ChartFigure
      id="equity"
      title="Equity over time"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, result.payoffMonth]}
              ticks={yearTicks(result.payoffMonth)}
              tickFormatter={(m: number) => (m === 0 ? 'Start' : `Year ${m / 12}`)}
              tick={{ fill: TEXT_COLOR }}
            />
            <YAxis
              width={72}
              tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })}
              tick={{ fill: TEXT_COLOR }}
            />
            <Tooltip labelFormatter={(m) => formatMonth(Number(m))} formatter={(v) => money(Number(v))} />
            <Legend />
            {people.map((p, k) => (
              <Area
                key={p.id}
                type="linear"
                dataKey={p.id}
                name={names[k]}
                stackId="equity"
                stroke={PERSON_COLORS[k]}
                strokeWidth={2}
                strokeDasharray={PERSON_DASHES[k]}
                fill={PERSON_COLORS[k]}
                fillOpacity={0.25}
                isAnimationActive={animate}
                label={endLabel(names[k], lastIndex, PERSON_COLORS[k])}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      }
      table={
        <DataTable
          caption="Equity by year"
          rows={yearlyRows(result)}
          columns={[
            ...names.map((n, k) => ({ header: n, value: (r: ScheduleRow) => money(r.people[k].equity) })),
            { header: 'Total', value: (r: ScheduleRow) => money(r.totalEquity) },
          ]}
        />
      }
    />
  );
}
```

`src/components/charts/BalanceOverTime.tsx`:

```tsx
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { balanceData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import { GRID_COLOR, TEXT_COLOR } from './theme';

export default function BalanceOverTime({ result, currency, animate }: ChartProps) {
  const money = (v: number) => formatCurrency(v, currency);
  const opening = result.rows[0].closingBalance;
  const summary =
    `Line chart of the loan balance falling from ${formatCurrency(opening, currency, { whole: true })} ` +
    `to zero by ${formatMonth(result.payoffMonth)}.`;

  return (
    <ChartFigure
      id="balance"
      title="Loan balance over time"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={balanceData(result)} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, result.payoffMonth]}
              ticks={yearTicks(result.payoffMonth)}
              tickFormatter={(m: number) => (m === 0 ? 'Start' : `Year ${m / 12}`)}
              tick={{ fill: TEXT_COLOR }}
            />
            <YAxis
              width={72}
              tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })}
              tick={{ fill: TEXT_COLOR }}
            />
            <Tooltip labelFormatter={(m) => formatMonth(Number(m))} formatter={(v) => money(Number(v))} />
            <Line
              type="linear"
              dataKey="balance"
              name="Loan balance"
              stroke={TEXT_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
          </LineChart>
        </ResponsiveContainer>
      }
      table={
        <DataTable
          caption="Loan balance by year"
          rows={yearlyRows(result)}
          columns={[{ header: 'Loan balance', value: (r: ScheduleRow) => money(r.closingBalance) }]}
        />
      }
    />
  );
}
```

`src/components/charts/ContributedVsEquity.tsx`:

```tsx
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import { displayName } from '../../state/appState';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { contributedData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import { endLabel } from './endLabel';
import { GRID_COLOR, PAID_IN_DASH, PERSON_COLORS, TEXT_COLOR } from './theme';

export default function ContributedVsEquity({ result, people, currency, animate }: ChartProps) {
  const data = contributedData(result);
  const lastIndex = data.length - 1;
  const names = people.map(displayName);
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);
  const whole = (v: number) => formatCurrency(v, currency, { whole: true });
  const summary =
    `Line chart comparing the money each person has paid in with their equity. By ${formatMonth(result.payoffMonth)}: ` +
    names
      .map((n, k) => `${n} paid in ${whole(final.people[k].cumulativeContributed)} and has ${whole(final.people[k].equity)} equity`)
      .join('; ') +
    '.';

  return (
    <ChartFigure
      id="contributed"
      title="Paid in versus equity"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, result.payoffMonth]}
              ticks={yearTicks(result.payoffMonth)}
              tickFormatter={(m: number) => (m === 0 ? 'Start' : `Year ${m / 12}`)}
              tick={{ fill: TEXT_COLOR }}
            />
            <YAxis
              width={72}
              tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })}
              tick={{ fill: TEXT_COLOR }}
            />
            <Tooltip labelFormatter={(m) => formatMonth(Number(m))} formatter={(v) => money(Number(v))} />
            <Legend />
            {people.flatMap((p, k) => [
              <Line
                key={`${p.id}_paid`}
                type="linear"
                dataKey={`${p.id}_paid`}
                name={`${names[k]} paid in`}
                stroke={PERSON_COLORS[k]}
                strokeWidth={2}
                strokeDasharray={PAID_IN_DASH}
                dot={false}
                isAnimationActive={animate}
                label={endLabel(`${names[k]} paid in`, lastIndex, PERSON_COLORS[k])}
              />,
              <Line
                key={`${p.id}_equity`}
                type="linear"
                dataKey={`${p.id}_equity`}
                name={`${names[k]} equity`}
                stroke={PERSON_COLORS[k]}
                strokeWidth={3}
                dot={false}
                isAnimationActive={animate}
                label={endLabel(`${names[k]} equity`, lastIndex, PERSON_COLORS[k])}
              />,
            ])}
          </LineChart>
        </ResponsiveContainer>
      }
      table={
        <DataTable
          caption="Paid in and equity by year"
          rows={yearlyRows(result)}
          columns={names.flatMap((n, k) => [
            { header: `${n} paid in`, value: (r: ScheduleRow) => money(r.people[k].cumulativeContributed) },
            { header: `${n} equity`, value: (r: ScheduleRow) => money(r.people[k].equity) },
          ])}
        />
      }
    />
  );
}
```

- [ ] **Step 11: Add the charts to `App`**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import BalanceOverTime from './components/charts/BalanceOverTime';
import ContributedVsEquity from './components/charts/ContributedVsEquity';
import EquityOverTime from './components/charts/EquityOverTime';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const animate = !usePrefersReducedMotion();
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const chartProps = { result, people: state.people, currency: state.currency, animate };

  return (
    <>
      <header className="site-header page">
        <h1 id="app-title">Shared Amortization Calculator</h1>
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
          <EquityOverTime {...chartProps} />
          <BalanceOverTime {...chartProps} />
          <ContributedVsEquity {...chartProps} />
        </section>
      </main>
    </>
  );
}
```

- [ ] **Step 12: Run the tests**

Run: `npm test`
Expected: PASS (all unit tests).

Run: `npx playwright test --project=chromium`
Expected: PASS (all end-to-end tests so far, including `charts.spec.ts`).

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json src tests/charts.spec.ts
git commit -m "Add equity, balance and paid-in charts with data tables" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Disclaimer banner, footer, currency selector and skip link

**Files:**
- Create: `src/components/DisclaimerBanner.tsx`, `src/components/Footer.tsx`, `src/components/CurrencySelector.tsx`
- Modify: `src/App.tsx`
- Test: `tests/site.spec.ts`

**Interfaces:**
- Consumes: `CURRENCIES`, `CurrencyCode` (Task 4); everything `App` already renders (Tasks 6–8).
- Produces: `DisclaimerBanner` default export, props `{ onDismiss: () => void }`, a region named "Disclaimer" with a "Dismiss" button; `Footer` default export (no props); `CurrencySelector` default export, props `{ value: CurrencyCode; onChange: (currency: CurrencyCode) => void }`, a `<select>` labelled "Currency"; a "Skip to results" link targeting `#results`.

- [ ] **Step 1: Write the failing end-to-end tests**

`tests/site.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('shows the disclaimer until dismissed, then remembers', async ({ page }) => {
  const banner = page.getByRole('region', { name: 'Disclaimer' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('For informational and educational purposes only.');

  await banner.getByRole('button', { name: 'Dismiss' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Disclaimer' })).toHaveCount(0);
});

test('shows the warranty disclaimer in the footer', async ({ page }) => {
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('No warranty.');
  await expect(footer).toContainText('provided "AS IS" and "AS AVAILABLE,"');
});

test('the currency selector changes displayed amounts', async ({ page }) => {
  const currency = page.getByRole('combobox', { name: 'Currency' });
  await expect(currency).toHaveValue('GBP');

  await currency.selectOption('EUR');
  await expect(page.getByTestId('monthly-payment')).toHaveText('€1,500.75');
  await page.getByRole('button', { name: 'Show data table for Loan balance over time' }).click();
  await expect(page.getByRole('table', { name: 'Loan balance by year' })).toContainText('€270,000.00');

  await currency.selectOption('USD');
  await expect(page.getByTestId('monthly-payment')).toHaveText('$1,500.75');
});

test('the skip link moves focus to the results', async ({ page }) => {
  const skip = page.getByRole('link', { name: 'Skip to results' });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeFocused();
});
```

(The skip-link test focuses the link directly rather than pressing Tab, because WebKit on macOS does not Tab to links by default.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/site.spec.ts --project=chromium`
Expected: FAIL — no region named "Disclaimer".

- [ ] **Step 3: Implement the three components**

`src/components/DisclaimerBanner.tsx`:

```tsx
import { useState } from 'react';

const STORAGE_KEY = 'disclaimerDismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Storage is blocked; the banner will show again next visit.
  }
}

interface DisclaimerBannerProps {
  onDismiss: () => void;
}

export default function DisclaimerBanner({ onDismiss }: DisclaimerBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  return (
    <div className="banner page" role="region" aria-label="Disclaimer">
      <p className="banner__title">Before you start</p>
      <p>
        <strong>For informational and educational purposes only.</strong> Shared Amortization Calculator is a
        calculation tool. Its outputs are estimates based on the inputs and assumptions you provide. They are not
        financial, investment, tax, accounting, or legal advice, and nothing in this project is a recommendation to
        buy, sell, or hold any financial product or to take any particular course of action. Consult a qualified
        professional before making financial decisions.
      </p>
      <button
        type="button"
        onClick={() => {
          saveDismissed();
          setDismissed(true);
          onDismiss();
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
```

The banner title is a paragraph, not a heading, so the page keeps a single `h1` first in the heading order.

`src/components/Footer.tsx`:

```tsx
const WARRANTY_TEXT =
  'This software is provided "AS IS" and "AS AVAILABLE," without warranty of any kind, express or implied, ' +
  'including but not limited to warranties of accuracy, completeness, reliability, merchantability, fitness for a ' +
  'particular purpose, and non-infringement. Calculations may contain errors, rely on simplified assumptions, or ' +
  'become outdated (for example, tax rules and rates change). You are responsible for verifying any result before ' +
  'relying on it.';

export default function Footer() {
  return (
    <footer className="site-footer page">
      <p>
        <strong>No warranty.</strong> {WARRANTY_TEXT}
      </p>
    </footer>
  );
}
```

`WARRANTY_TEXT` is the README's "No warranty" paragraph. When the project owner supplies their own statement, replace this constant (and the `toContainText` assertion in `tests/site.spec.ts`).

`src/components/CurrencySelector.tsx`:

```tsx
import { CURRENCIES, type CurrencyCode } from '../format';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div className="currency-select">
      <label htmlFor="currency">Currency</label>
      <select id="currency" value={value} onChange={(e) => onChange(e.target.value as CurrencyCode)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Assemble the final `App`**

Replace `src/App.tsx` with:

```tsx
import { useRef, useState } from 'react';
import BalanceOverTime from './components/charts/BalanceOverTime';
import ContributedVsEquity from './components/charts/ContributedVsEquity';
import EquityOverTime from './components/charts/EquityOverTime';
import CurrencySelector from './components/CurrencySelector';
import DisclaimerBanner from './components/DisclaimerBanner';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import Footer from './components/Footer';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const animate = !usePrefersReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const chartProps = { result, people: state.people, currency: state.currency, animate };

  return (
    <>
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <DisclaimerBanner onDismiss={() => titleRef.current?.focus()} />
      <header className="site-header page">
        <h1 id="app-title" ref={titleRef} tabIndex={-1}>
          Shared Amortization Calculator
        </h1>
        <CurrencySelector value={state.currency} onChange={(currency) => patch({ currency })} />
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
          <EquityOverTime {...chartProps} />
          <BalanceOverTime {...chartProps} />
          <ContributedVsEquity {...chartProps} />
        </section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx playwright test --project=chromium`
Expected: PASS (all end-to-end tests).

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src tests/site.spec.ts
git commit -m "Add disclaimer banner, warranty footer, currency selector and skip link" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Accessibility test suite

**Files:**
- Test: `tests/a11y.spec.ts`
- Modify (only if a test below fails): the component or `src/styles.css` rule that renders the failing element

**Interfaces:**
- Consumes: the complete app from Task 9.
- Produces: an automated AAA regression suite that CI runs.

- [ ] **Step 1: Install axe**

```bash
npm install -D @axe-core/playwright
```

- [ ] **Step 2: Write the tests**

`tests/a11y.spec.ts`:

```ts
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

async function areaPathChangesAfterLoad(page: Page): Promise<boolean> {
  const area = page.locator('.recharts-area-area').first();
  await expect(area).toBeVisible();
  const before = await area.getAttribute('d');
  await page.waitForTimeout(150);
  const after = await area.getAttribute('d');
  return before !== after;
}

test('charts animate by default', async ({ page }) => {
  await page.reload();
  expect(await areaPathChangesAfterLoad(page)).toBe(true);
});

test('reduced motion disables chart animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  expect(await areaPathChangesAfterLoad(page)).toBe(false);
});
```

- [ ] **Step 3: Run the suite on all three browsers**

Run: `npx playwright test tests/a11y.spec.ts`
Expected: PASS on chromium, firefox and webkit.

If a test fails, the failure names the element: axe prints each violation `id` with CSS `targets`, and the size test prints the element's HTML. Fix the rule in the component that renders that element or in `src/styles.css` (keeping to the colour tokens), then re-run until the suite passes. Do not disable axe rules or loosen thresholds to get a pass.

The two animation tests pair up: "charts animate by default" proves the path-comparison technique detects animation (Recharts animates for 1.5 s by default), so "reduced motion disables chart animation" passing is meaningful.

- [ ] **Step 4: Run everything**

Run: `npm test && npx playwright test`
Expected: all unit tests and all end-to-end tests PASS on all three browsers.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/a11y.spec.ts src
git commit -m "Add WCAG AAA accessibility test suite" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: GitHub Pages deployment and CI

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/playwright.yml`

**Interfaces:**
- Consumes: `npm test`, `npm run build` (Task 1); `dist/` output with base `/shared-amortization-calculator/`.
- Produces: a deployment on every push to `main`; CI that runs unit and end-to-end tests.

- [ ] **Step 1: Verify the production build uses the base path**

Run: `npm run build && grep -o 'src="/shared-amortization-calculator/assets/[^"]*"' dist/index.html`
Expected: one match like `src="/shared-amortization-calculator/assets/index-XXXX.js"`.

- [ ] **Step 2: Add the deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run unit tests in the existing CI workflow**

In `.github/workflows/playwright.yml`, replace:

```yaml
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
```

with:

```yaml
    - name: Run unit tests
      run: npm test
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
```

- [ ] **Step 4: Check the workflow files parse**

Run: `node -e "for (const f of ['.github/workflows/deploy.yml', '.github/workflows/playwright.yml']) { require('fs').readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/\t/.test(l)) throw new Error(f + ':' + (i + 1) + ' has a tab'); }); } console.log('ok')"`
Expected: `ok` (YAML forbids tabs; GitHub validates the rest on push).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows
git commit -m "Deploy to GitHub Pages and run unit tests in CI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand off the manual steps to the project owner**

Report these to the human; they cannot be automated from this repo:

1. In the GitHub repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** before the first deploy.
2. Send the final footer warranty text if it differs from the README's "No warranty" paragraph (Task 9 `Footer.tsx`).
3. Do a manual pass with a screen reader (VoiceOver on macOS) and keyboard only: every control is reachable and announced with its name and value, the headline figures are announced after a change, and the data tables read correctly. Automated axe checks do not cover this.
