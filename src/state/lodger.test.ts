import { describe, expect, it } from 'vitest';
import { computeSchedule } from '../calc';
import { makeInputs, makePerson } from '../calc/fixtures';
import type { MortgageInputs } from '../calc/types';
import { initialState } from './appState';
import { lodgerActive, lodgerCoversLoan, lodgerPeriod, paymentAfterLodger } from './lodger';

// £1,200 loan at 0% over 1 year = £100/month.
function schedule(overrides: Partial<MortgageInputs>) {
  return computeSchedule(
    makeInputs({ homePrice: 1500, downPayment: 300, annualRatePercent: 0, termYears: 1, ...overrides }),
  );
}

describe('paymentAfterLodger', () => {
  const ticked = { ...initialState(), lodgerEnabled: true };

  it('takes the rent off the monthly payment', () => {
    expect(paymentAfterLodger(1500.75, ticked)).toBeCloseTo(1000.75, 9);
  });

  it('leaves the payment alone when the box is unticked', () => {
    expect(paymentAfterLodger(1500.75, initialState())).toBe(1500.75);
  });

  it('never goes below zero', () => {
    expect(paymentAfterLodger(1500.75, { ...ticked, lodgerRentMonthly: 2000 })).toBe(0);
  });

  it('treats a rent of zero as no lodger', () => {
    const zero = { ...ticked, lodgerRentMonthly: 0 };
    expect(paymentAfterLodger(1500.75, zero)).toBe(1500.75);
    expect(lodgerActive(zero)).toBe(false);
    expect(lodgerActive(ticked)).toBe(true);
    expect(lodgerActive(initialState())).toBe(false);
  });
});

describe('lodgerPeriod and lodgerCoversLoan', () => {
  it('names the months the rent is paid', () => {
    expect(lodgerPeriod(schedule({ lodgerRentMonthly: 40, lodgerMonths: 6 }))).toBe('months 1–6');
  });

  it('says whole loan when the rent lasts as long as the loan', () => {
    const result = schedule({ lodgerRentMonthly: 40, lodgerMonths: 12 });
    expect(lodgerPeriod(result)).toBe('whole loan');
    expect(lodgerCoversLoan(result)).toBe(true);
  });

  it('covers the loan when overpayments end it before the rent stops', () => {
    const people = [makePerson({ overpaymentMonthly: 100 })];
    expect(lodgerCoversLoan(schedule({ lodgerRentMonthly: 40, lodgerMonths: 12, people }))).toBe(true);
  });

  it('does not cover the loan when there is no lodger', () => {
    expect(lodgerCoversLoan(schedule({}))).toBe(false);
  });
});
