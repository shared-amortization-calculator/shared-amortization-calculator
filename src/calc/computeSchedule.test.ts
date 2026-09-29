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

  describe('with fees added to the loan', () => {
    // Same hand case plus £120 of fees: £1,320 loan at 0% over 1 year = £110/month.
    // The fee comes out of the deposit's equity, split like the deposit: A £120, B £60 at month 0.
    const withFees = (equityMode: EquityMode) => ({ ...handCase(equityMode), feesAddedToLoan: 120 });

    it('starts with total equity of the deposit minus the fees', () => {
      const opening = computeSchedule(withFees('proportional')).rows[0];
      expect(opening.closingBalance).toBe(1320);
      expect(opening.totalEquity).toBe(180);
      expect(opening.people.map((p) => p.cumulativeContributed)).toEqual([200, 100]);
    });

    it('depositBaseline mode credits the deposit net of its share of the fees', () => {
      const month0 = equities(withFees('depositBaseline'), 0);
      expect(month0[0]).toBeCloseTo(120, 9);
      expect(month0[1]).toBeCloseTo(60, 9);
      const month12 = equities(withFees('depositBaseline'), 12);
      expect(month12[0]).toBeCloseTo(1110, 9);
      expect(month12[1]).toBeCloseTo(390, 9);
    });

    it('lockedDeposit mode credits the deposit net of its share of the fees', () => {
      const month12 = equities(withFees('lockedDeposit'), 12);
      expect(month12[0]).toBeCloseTo(648, 9);
      expect(month12[1]).toBeCloseTo(852, 9);
    });

    it.each(MODES)('%s: equity always sums to total equity', (equityMode) => {
      for (const row of computeSchedule(withFees(equityMode)).rows) {
        const total = row.people.reduce((a, p) => a + p.equity, 0);
        expect(total).toBeCloseTo(row.totalEquity, 9);
      }
    });

    it.each(MODES)('%s: starts below zero when fees exceed the deposit', (equityMode) => {
      const inputs = { ...withFees(equityMode), downPayment: 0 };
      const opening = computeSchedule(inputs).rows[0];
      expect(opening.totalEquity).toBe(-120);
      for (const p of opening.people) {
        expect(Number.isFinite(p.equity)).toBe(true);
        expect(p.equity).toBeLessThan(0);
      }
    });
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
