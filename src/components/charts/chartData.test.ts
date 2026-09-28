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
