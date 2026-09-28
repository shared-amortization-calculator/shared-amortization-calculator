# Shared Amortization Calculator — Design

Date: 2026-09-28
Status: Approved in conversation, pending written-spec review

## 1. Purpose

A single-page web app that models a repayment mortgage shared by one to three
people. Users set the purchase and loan terms, say how much each person puts
into the down payment and the monthly payments (including optional
overpayments), and choose one of four rules for attributing equity. The app
then charts each person's equity, the loan balance, and each person's money
paid in versus equity gained over the life of the loan.

The app runs entirely in the browser, is hosted on GitHub Pages, and targets
WCAG 2.2 AAA.

### Success criteria

- A user can enter a mortgage and 1–3 people and see all three charts update
  immediately as they move any slider.
- The loan schedule matches a standard fixed-rate amortization calculation to
  the penny (verified by unit tests against reference values).
- Each of the four equity modes produces the per-person figures defined in
  §4.3.
- A first-time visitor sees the disclaimer banner; after dismissing it, they
  do not see it again in that browser.
- The footer shows the warranty disclaimer on every visit.
- Automated axe-core checks report no WCAG A/AA/AAA violations, and a manual
  keyboard-only pass can operate every control.
- A push to `main` builds and deploys the site to GitHub Pages.

## 2. Scope

### In scope

- Home price, down payment, fixed annual interest rate, term in years,
  monthly payments.
- 1–3 people, each with a name, a share of the down payment, a share of the
  regular monthly payment, and an optional recurring monthly overpayment with
  a start month.
- Four selectable equity attribution modes (§4.3).
- Three charts, each with an accessible data-table alternative.
- Headline results: monthly payment, total interest, payoff month.
- Currency selector (GBP default, USD, EUR). Display formatting only; no
  exchange-rate conversion.
- First-use disclaimer banner and a footer with a warranty disclaimer.
- GitHub Pages deployment through GitHub Actions.

### Out of scope

- Contribution splits that change over time. One split applies for the whole
  term.
- Variable or changing interest rates, remortgaging, payment frequencies other
  than monthly.
- One-off lump-sum overpayments. Overpayments are recurring only.
- Recasting (lowering the payment after overpayments). Overpayments shorten
  the term.
- Property appreciation or depreciation.
- Saving the user's inputs. Only the banner dismissal is stored (in
  `localStorage`). No data leaves the browser.
- Calendar dates. The schedule is expressed in months from the start of the
  loan (shown as "Year N, month M").

## 3. Technology

| Concern          | Choice                                               |
|------------------|------------------------------------------------------|
| Build            | Vite, static output to `dist/`                       |
| UI               | React with TypeScript                                |
| State            | React `useState`; schedule derived with `useMemo`    |
| Charts           | Recharts                                             |
| Unit tests       | Vitest, colocated as `src/**/*.test.ts`              |
| End-to-end tests | Playwright (existing config), in `tests/`            |
| Accessibility    | `@axe-core/playwright` inside the Playwright suite   |
| Deployment       | GitHub Actions → GitHub Pages                        |

Vite's `base` is set to `/shared-amortization-calculator/` so asset paths work
under the GitHub Pages project URL.

## 4. Calculation engine (`src/calc/`)

Pure TypeScript with no React imports. Everything the UI shows comes from one
function:

```ts
function computeSchedule(inputs: MortgageInputs): ScheduleResult
```

### 4.1 Types (`types.ts`)

```ts
type PersonId = string;

interface Person {
  id: PersonId;
  name: string;
  downPaymentShare: number;        // fraction 0–1; shares across people sum to 1
  paymentShare: number;            // fraction 0–1 of the regular monthly payment; sum to 1
  ownershipShare: number;          // fraction 0–1; used by mode 'fixed'; sum to 1
  principalShare: number;          // fraction 0–1; used by mode 'lockedDeposit'; sum to 1
  overpaymentMonthly: number;      // currency units per month, >= 0
  overpaymentStartMonth: number;   // 1-based month; applies from this month on
}

type EquityMode =
  | 'proportional'     // mode 1
  | 'fixed'            // mode 2
  | 'depositBaseline'  // mode 3
  | 'lockedDeposit';   // mode 4

interface MortgageInputs {
  homePrice: number;
  downPayment: number;             // currency units, 0 <= downPayment < homePrice
  annualRatePercent: number;       // e.g. 4.5 for 4.5%
  termYears: number;               // integer
  people: Person[];                // length 1–3
  equityMode: EquityMode;
}

interface PersonMonth {
  personId: PersonId;
  paidThisMonth: number;           // regular share + own overpayment actually applied
  cumulativeContributed: number;   // down payment share + all payments to date
  equity: number;
}

interface ScheduleRow {
  month: number;                   // 1-based; month 0 is the opening position
  openingBalance: number;
  interest: number;
  regularPrincipal: number;
  overpaymentPrincipal: number;
  closingBalance: number;
  totalEquity: number;             // homePrice - closingBalance
  people: PersonMonth[];
}

interface ScheduleResult {
  monthlyPayment: number;          // scheduled regular payment
  totalInterest: number;
  payoffMonth: number;             // last month with a payment
  rows: ScheduleRow[];             // row for month 0, then one per month until payoff
}
```

Share fractions are stored as fractions (0–1) in the engine; the UI shows
percentages.

### 4.2 Loan schedule (`amortization.ts`)

Let `L = homePrice − downPayment`, `i = annualRatePercent / 100 / 12`,
`n = termYears × 12`.

- Regular payment: `P = L × i / (1 − (1 + i)^−n)`; when `i = 0`, `P = L / n`.
- For each month `t` starting at 1, with `B` the opening balance:
  1. `interest = B × i`
  2. `regularPrincipal = min(P − interest, B)`
  3. Each person with `t >= overpaymentStartMonth` offers their
     `overpaymentMonthly`. The total offered is applied to principal, capped
     at the balance left after step 2. When the cap binds, each person's
     applied overpayment is reduced pro rata to what they offered.
  4. `closingBalance = B − regularPrincipal − overpaymentPrincipal`
- Stop after the month where the closing balance falls below 0.005 (treat as
  zero). This is `payoffMonth`, which is `n` without overpayments and earlier
  with them.
- The regular payment actually made in a month is
  `interest + regularPrincipal` (smaller than `P` only in the final month).
  Each person pays `paymentShare ×` that amount, plus their applied
  overpayment.

Calculations use full floating-point precision. Rounding to pennies happens
only for display.

Month 0 is the opening position: balance `L`, total equity equal to the down
payment, and each person's contribution equal to their down-payment share.

### 4.3 Equity modes (`equityModes.ts`)

Four strategy functions share one signature and are selected by `equityMode`.
In the definitions below, for person `k` at the end of month `t`:

- `D` = down payment, `d_k` = `downPaymentShare`
- `E(t)` = total equity = `homePrice − closingBalance(t)`
- `R(t)` = principal repaid so far = `L − closingBalance(t)`
- `C_k(t)` = `cumulativeContributed` = `D × d_k` + everything person `k` has
  paid, including their share of interest and their overpayments

| Mode | UI label | Person `k`'s equity at month `t` |
|------|----------|----------------------------------|
| `proportional` | Proportional to money paid in | `E(t) × C_k(t) / Σ C(t)` |
| `fixed` | Fixed ownership shares | `E(t) × ownershipShare_k` |
| `depositBaseline` | Deposit, plus principal each person repays | `D × d_k` + Σ over months of (`paymentShare_k × regularPrincipal` + person `k`'s applied overpayment) |
| `lockedDeposit` | Deposit locked in, remaining loan split by fixed shares | `D × d_k + R(t) × principalShare_k` |

Notes:

- `proportional` counts interest as money paid in, so paying more interest
  raises a person's share.
- `depositBaseline` counts only principal. Interest a person pays does not
  add to their equity.
- `lockedDeposit` splits all principal repaid, including overpayments, by
  `principalShare` regardless of who paid it.
- In every mode, the people's equity sums to `E(t)`.

## 5. UI (`src/components/`)

### 5.1 Page layout

From top to bottom:

1. **Disclaimer banner** (`DisclaimerBanner.tsx`). A non-modal region at the
   top of the page with a heading and the short disclaimer (the first
   paragraph of the README's "Disclaimer and Terms of Use"). A "Dismiss"
   button hides it and stores `disclaimerDismissed = true` in `localStorage`.
   If `localStorage` is unavailable, the banner shows on every visit.
2. **Header**: app title and `CurrencySelector.tsx`, a native `<select>`
   labelled "Currency" with GBP (£, default), USD ($), and EUR (€).
   Formatting uses `Intl.NumberFormat` with the selected currency code.
3. **Mortgage parameters** (`MortgageForm/`): home price, down payment,
   interest rate, term.
4. **People** (`PeopleControls/`): one card per person, with "Add person"
   (hidden at 3) and "Remove" (hidden at 1).
5. **Equity mode** (`EquityModeSelector/`): a radio group of the four modes,
   each with a one-sentence explanation. Controls needed only by one mode
   (ownership shares for `fixed`, principal shares for `lockedDeposit`)
   appear only when that mode is selected.
6. **Results**: headline figures in an `aria-live="polite"` region, then the
   three charts.
7. **Footer** (`Footer.tsx`): warranty disclaimer text supplied by the
   project owner, held in one constant. Until it is supplied, the plan uses
   the README's "No warranty" paragraph.

### 5.2 Slider and number pairs

A reusable `SliderField` component renders a label, an
`<input type="range">`, and an `<input type="number">` that share one state
value. The label is tied to both inputs. The range input carries an
`aria-valuetext` that includes the unit (for example "4.5 percent" or
"£30,000").

| Field | Range (slider) | Step | Default |
|-------|---------------|------|---------|
| Home price | 50,000 – 2,000,000 | 5,000 | 300,000 |
| Down payment | 0 – 99.5% of home price | 0.5% | 10% |
| Interest rate | 0 – 15% | 0.05% | 4.5% |
| Term | 1 – 40 years | 1 | 25 |
| Overpayment per month | 0 – 2,000 | 10 | 0 |
| Overpayment start month | 1 – term in months | 1 | 1 |

Home price and overpayment number fields accept values above the slider's
maximum. The slider then sits at its maximum.

The down payment is held in UI state as a percentage of the home price, so
changing the home price keeps the percentage and changes the amount. Its
slider and number field both work in percent; the matching currency amount
is shown as text beside them. The engine receives the amount
(`homePrice × percent / 100`).

### 5.3 Split controls

Four splits exist: down payment, regular payment, ownership (mode `fixed`),
and remaining principal (mode `lockedDeposit`). Each is a `SplitControl`
showing one row per person:

- With one person, the split is fixed at 100% and shown as text.
- With two or three people, every person except the last has a 0–100%
  slider and number pair. The last person's share is shown read-only as
  100% minus the others.
- Moving a slider that would push the total over 100% is clamped to the
  remaining amount.
- Adding or removing a person resets every split to equal shares.

Splits therefore always sum to 100%, so there is no error state for them.

### 5.4 Validation

- The down payment is capped at 99.5%, so there is always a loan.
- Number fields clamp to their minimum (0, or 1 for term and start month).
  Term is rounded to a whole number.
- An overpayment start month beyond the payoff month has no effect and is
  not an error.
- Person names default to "Person 1", "Person 2", "Person 3". An empty name
  falls back to the default in labels and charts.

### 5.5 Charts (`components/charts/`)

All three use months on the x-axis, labelled by year, and run from month 0
to `payoffMonth`.

1. **Equity over time** (`EquityOverTime.tsx`): stacked area, one series per
   person.
2. **Loan balance over time** (`BalanceOverTime.tsx`): line of
   `closingBalance`.
3. **Paid in versus equity** (`ContributedVsEquity.tsx`): per person, one
   line for `cumulativeContributed` and one for `equity`.

Each chart distinguishes series by more than colour: distinct dash patterns
or fills, plus direct labels. A "Show data table" toggle under each chart
reveals a table with the same data sampled yearly (plus the payoff month).

### 5.6 Accessibility (WCAG 2.2 AAA)

- Text contrast of at least 7:1 (4.5:1 for large text), including chart
  labels and focus indicators.
- A visible focus indicator on every interactive element, at least 2px, with
  at least 3:1 contrast against its surroundings.
- Interactive targets at least 44×44 CSS px.
- Native form elements throughout: range, number, select, radio, button. No
  custom ARIA widgets.
- A "Skip to results" link, and landmarks (`header`, `main`, `footer`), with
  one `h1` and an ordered heading structure.
- The headline results region announces changes politely. Chart updates
  are not announced.
- Usable at 400% zoom and at 320 CSS px width without horizontal scrolling.
- Respects `prefers-reduced-motion` by turning off chart animation.

## 6. File layout

```
src/
  calc/
    types.ts
    amortization.ts          + amortization.test.ts
    equityModes.ts           + equityModes.test.ts
    index.ts                 # computeSchedule
  components/
    DisclaimerBanner.tsx
    Footer.tsx
    CurrencySelector.tsx
    SliderField.tsx
    SplitControl.tsx
    MortgageForm/
    PeopleControls/
    EquityModeSelector/
    Results/                 # headline figures + live region
    charts/
      EquityOverTime.tsx
      BalanceOverTime.tsx
      ContributedVsEquity.tsx
      DataTable.tsx
  hooks/
    useAmortizationSchedule.ts
  format.ts                  # currency and month formatting
  App.tsx
  main.tsx
tests/                       # Playwright
```

## 7. Testing

### Unit (Vitest)

- Regular payment and full schedule against reference values for at least
  two loans, including a 0% rate.
- Overpayments starting at month 1 and mid-term, a shortened payoff month,
  and pro-rata capping in the final month.
- Each equity mode with one, two, and three people, including a check that
  per-person equity sums to total equity every month.
- Hand-calculated cases where the four modes give different answers.

### End-to-end (Playwright)

- The banner appears on first load, dismisses, and stays dismissed after a
  reload.
- The footer disclaimer is present.
- Golden path: changing inputs updates the headline figures.
- Adding and removing people; split remainder behaviour.
- Mode-specific controls appear only for their mode.
- The currency selector changes displayed symbols.
- Keyboard-only operation of sliders (arrow keys change values).
- axe-core scan with WCAG A, AA, and AAA tags on: the initial page, the page
  with three people, and the page with a data table open.

The placeholder `tests/example.spec.ts` is removed.

## 8. Build and deployment

- `package.json` scripts: `dev`, `build`, `preview`, `test` (Vitest),
  `test:e2e` (Playwright).
- The existing `.github/workflows/playwright.yml` also runs the Vitest suite.
- A new `.github/workflows/deploy.yml` builds on push to `main` and publishes
  `dist/` using `actions/upload-pages-artifact` and `actions/deploy-pages`.
  GitHub Pages must be set to "GitHub Actions" as its source in the
  repository settings.
- `dist/` is added to `.gitignore`.
- `package.json` `license` changes from `ISC` to `AGPL-3.0-only` to match
  `LICENSE` and the README.
