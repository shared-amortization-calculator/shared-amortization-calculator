# Lodger Rent — Design

Date: 2026-11-08
Status: Agreed in conversation, pending written-spec review

## 1. Intent

Many shared households take in a lodger, and the lodger's rent helps pay the
mortgage. Today the app has no way to show that. This feature adds an
optional lodger who pays a fixed monthly rent for a set number of months. The
rent comes off the regular monthly payment first. The "Monthly payment split"
then divides only what's left between the people.

Success means someone with a lodger can tick a box, enter the rent and how
long it lasts, and see straight away:

- what each person now pays each month, while the lodger is there and after
  the lodger leaves;
- how much the lodger paid in overall;
- when the lodger was there, on the over-time charts;
- equity that follows the selected equity rule, as described in §3.

## 2. Goals, non-goals, anti-goals

### Goals

- One optional lodger, with a fixed rent per month, starting in month 1 and
  running for a set number of months (from 1 up to the full term).
- The rent reduces the regular payment the people share. The payment split
  applies to the remainder.
- Equity attribution follows the selected equity rule (§3).
- The lodger settings are part of the scenario link, Copy Scenario and Reset,
  like every other input.

### Non-goals

- The lodger never owns equity and is never one of the "people".
- Rent that changes over time, or that starts after month 1.
- More than one lodger.
- Rent above the monthly payment turning into an overpayment. Any rent beyond
  the regular payment is ignored.
- Tax on rental income (for example the UK Rent a Room scheme), or costs of
  having a lodger.

### Anti-goals (these would be failures even if the feature works)

- **Any change at all to the numbers when the lodger box is unticked.** With
  no lodger, every figure, chart and table must match what the app shows
  today.
- People's equity no longer adding up to the home's total equity.
- Lodger rent changing the loan itself. The balance, interest, payoff month
  and overpayments are unchanged. Only who pays the regular payment changes.

## 3. Calculation

### 3.1 Inputs

`AppState` gains three fields:

| Field               | Meaning                                    | Default |
|---------------------|--------------------------------------------|---------|
| `lodgerEnabled`     | the "We have a lodger" tick box            | `false` |
| `lodgerRentMonthly` | rent per month, currency units, ≥ 0        | `500`   |
| `lodgerMonths`      | number of months, integer, 1 to term months| `60`    |

`toMortgageInputs` passes the lodger to the engine as an effective rent and
month count. When `lodgerEnabled` is false, the effective rent is 0. The
engine never sees the tick box.

If the term is shortened below `lodgerMonths`, the stored value is kept, as
`overpaymentStartMonth` is today. Only the slider and the URL reader limit
it, and the calculation naturally stops at the end of the loan.

The defaults of £500 and 60 months are my call. They are shown the first time
the box is ticked. 60 is limited to the term if the term is shorter.

### 3.2 Each month

For month `m` of the loan schedule, where `regularPayment` is that month's
interest plus regular principal (smaller in the final month):

```
lodgerPaid    = m <= lodgerMonths ? min(lodgerRentMonthly, regularPayment) : 0
peopleRegular = regularPayment - lodgerPaid
paid[k]       = paymentShare[k] * peopleRegular + appliedOverpayment[k]
contributed[k]   += paid[k]                      // person k's "paid in"
principalPaid[k] += paymentShare[k] * regularPrincipal + appliedOverpayment[k]
```

- The loan schedule (`buildLoanSchedule`) does not change at all.
- The rent stops after `lodgerMonths`, or when the loan is paid off if that
  comes first (there are no more schedule months).
- `principalPaid` is the same formula as today. This is deliberate. The
  principal that the lodger's rent covers is credited to the people by the
  monthly payment split, and each person's own regular principal is already
  credited the same way.

### 3.3 Equity, by rule

| Rule                                   | Effect of the lodger                                       |
|----------------------------------------|------------------------------------------------------------|
| Proportional to money paid in          | Lodger rent is not anyone's "paid in". Equity follows what the people themselves paid in, so the lodger's contribution is shared in that ratio. |
| Fixed ownership shares                 | No change. Equity follows the set shares.                  |
| Deposit, plus principal each person repays | No change in equity. The lodger's principal is credited by the payment split (§3.2). |
| Deposit preserved, remaining loan split by fixed shares | No change. The loan repaid, including the lodger's part, follows the set shares. |

A consequence, stated here so nobody mistakes it for a bug: only the
proportional rule's equity moves when a lodger is added. In every rule, each
person's "paid in" goes down.

### 3.4 Outputs

- `ScheduleRow` gains `lodgerPaid` (rent applied that month) and
  `cumulativeLodgerPaid`.
- `ScheduleResult` gains `totalLodgerPaid` and `lodgerEndMonth`: the last
  month with rent applied, or 0 when there is no lodger.
- `PersonMonth.paidThisMonth` and `cumulativeContributed` hold the people's
  own money only, as in §3.2.

## 4. Screen

Mockups were reviewed in the browser. These were chosen:

- the lodger box inside People (§4.1);
- two amounts per person in the split (§4.2);
- the "After lodger rent" headline figure and the "Lodger" summary entry
  (§4.3);
- shading on the over-time charts (§4.4).

A lodger bar on the paid in versus equity chart was turned down.

### 4.0 Wording by currency

The word "lodger" follows the currency, the same way "deposit" and "down
payment" do. Add `lodgerTerm(currency)` next to `depositTerm` in
`src/format.ts`:

| Currency               | Word     |
|------------------------|----------|
| USD                    | roommate |
| GBP, EUR (Ireland), AUD| lodger   |

Every label on screen in this section uses the term, with `capitalize` where
needed. That covers:

- the fieldset legend and the tick box ("We have a roommate");
- the headline ("After roommate rent");
- the summary entry;
- the chart shading label and chart summaries;
- the table column ("Roommate paid in").

The examples below use "lodger". Code identifiers and URL parameters stay as
`lodger…` whatever the currency.

### 4.1 Lodger box (in People)

A new fieldset, legend "Lodger", inside the People section. It sits after
the deposit split and just before "Monthly payment split".

- A tick box labelled "We have a lodger", unticked by default.
- When ticked, these appear below it:
  - "Rent per month": a number field with the currency prefix, min 0, like
    "Overpayment per month".
  - "Rent paid for": a months slider plus number box, from 1 to the term in
    months, like "Overpayments start in month". The hint reads like
    "60 months (5 years)".
- Unticking hides the fields but keeps their values for the session, so
  ticking again brings them back.

### 4.2 Monthly payment split

When the lodger is on and the rent is above 0:

- Each person's amount box and the remainder line are based on the
  **remainder while the lodger pays**:
  `monthlyPayment - min(rent, monthlyPayment)`. Typing an amount sets the
  share as a fraction of that remainder.
- Next to each person's amount there is extra text giving both periods, for
  example "months 1–60 · then £750.38". The last person's line reads
  "Sam share: 50% (£450.37 months 1–60, then £750.37, the remainder)".
- "months 1–N" uses `lodgerEndMonth`. If the rent lasts until the loan is
  paid off, there is no "then" part. The wording becomes "while the lodger
  pays".
- If the rent covers the whole payment, the remainder is £0. The amount boxes
  show £0 and typing in them does nothing. The % sliders still work, and the
  "then" amounts still show.

When the lodger is off, the split looks exactly as it does today.

With only one person, the split line ("Name: 100%") stays as it is today.
The headline figures (§4.3) already show what that person pays. This is my
call.

### 4.3 Results

- **Headline:** a new figure after "Monthly payment", labelled "After lodger
  rent". It shows `monthlyPayment - min(rent, monthlyPayment)`, with the
  small text "months 1–N" (or "whole loan").
- **Repaid summary:** after the people's entries, a "Lodger" entry with
  "Paid in" set to `totalLodgerPaid`, and "Equity" reading "none".
- Both appear only when the lodger is on and the rent is above 0.

### 4.4 Charts

- **Equity over time** and **Balance over time:** shade month 0 to
  `lodgerEndMonth` (a Recharts `ReferenceArea`), labelled "Lodger" with the
  period, for example "Lodger, months 1–60". The text summary for each chart
  gains a sentence giving the lodger's period.
- **Data tables** for those two charts gain a "Lodger paid in" column, a
  running total, as the text equivalent of the shading. The cumulative
  column is my call, chosen to match the "paid in" columns elsewhere.
- **Paid in versus equity:** no lodger bar. Its numbers change through
  "paid in" anyway.
- None of this appears when the lodger is off.

## 5. Scenario link

- New query parameters: `lodger` (`1` or `0`), `lrent` and `lmonths`, always
  written like the existing ones. A fresh page still gets a bare URL, because
  the defaults compare equal.
- Reading: a missing or invalid `lodger` means off. `lrent` is limited to
  ≥ 0 and `lmonths` to an integer from 1 to term months, falling back to the
  defaults, using the existing `readNumber`.
- Reset returns to the defaults (unticked, £500, 60 months).

## 6. Constraints

- Accessibility target is WCAG 2.2 AAA, as for the rest of the app. That
  covers: label text and contrast for the shading, a tick box with a visible
  label, the new fields announced like the existing ones, and the axe
  Playwright checks passing with the lodger on.
- Follow the existing patterns: `NumberField`, `SliderField`, `EndStats`,
  `DataTable`, and `readNumber` in `urlState.ts`.

## 7. Testing

- **Unit (`computeSchedule`):**
  - With no lodger, results are identical to today's fixtures.
  - The remainder is split by payment share.
  - The rent stops after N months.
  - The rent stops at an early payoff caused by overpayments.
  - Rent above the payment is capped and the excess ignored.
  - The final short month is capped too.
  - In each of the four rules, people's equity sums to total equity.
  - Equity is unchanged by the lodger in the fixed, deposit-plus-principal
    and preserved-deposit rules.
  - `totalLodgerPaid` and `lodgerEndMonth` are correct.
- **Unit (`urlState`):** round trip with the lodger on and off; invalid and
  out-of-range values.
- **End-to-end:**
  - Ticking the box shows the fields.
  - The split shows both periods.
  - The headline and the Lodger summary appear.
  - Unticking restores today's figures.
  - Copy Scenario and Reset include the lodger.
  - Axe passes with the lodger on.
  - Switching to USD changes every "lodger" label to "roommate".
- **Unit (`format`):** `lodgerTerm` for each currency.

## 8. Left to the builder

- How `lodgerEndMonth` and the remainder are passed to `PeopleControls` and
  `SplitControl`. For example, a second total, or a formatter for the extra
  text.
- Shading colour and label placement, within the contrast rules.
- Exact wording of the chart summary sentences.
