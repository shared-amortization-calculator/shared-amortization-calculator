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
