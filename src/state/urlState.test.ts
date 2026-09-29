import { describe, expect, it } from 'vitest';
import { addPerson, initialState, updatePerson, type AppState } from './appState';
import { setShare } from './splits';
import { stateFromQuery, stateToQuery } from './urlState';

function customState(): AppState {
  let state = addPerson(initialState());
  state = {
    ...state,
    homePrice: 425000,
    downPaymentPercent: 15,
    feesAddedToLoan: 1999,
    annualRatePercent: 5.25,
    termYears: 30,
    equityMode: 'lockedDeposit',
    currency: 'EUR',
  };
  state = { ...state, people: setShare(state.people, 'downPaymentShare', 0, 0.6) };
  state = updatePerson(state, 'p1', { name: 'Ana & Bo', overpaymentMonthly: 150, overpaymentStartMonth: 13 });
  return state;
}

describe('stateToQuery / stateFromQuery', () => {
  it('round-trips a three-person scenario', () => {
    const state = customState();
    expect(state.people).toHaveLength(3);
    expect(stateFromQuery(stateToQuery(state))).toEqual(state);
  });

  it('round-trips a single person', () => {
    const state = { ...initialState(), people: initialState().people.slice(0, 1) };
    state.people = [{ ...state.people[0], downPaymentShare: 1, paymentShare: 1, ownershipShare: 1, principalShare: 1 }];
    expect(stateFromQuery(stateToQuery(state))).toEqual(state);
  });

  it('round-trips the defaults', () => {
    expect(stateFromQuery(stateToQuery(initialState()))).toEqual(initialState());
  });

  it('writes readable parameter names', () => {
    const params = new URLSearchParams(stateToQuery(customState()));
    expect(params.get('price')).toBe('425000');
    expect(params.get('rate')).toBe('5.25');
    expect(params.get('cur')).toBe('EUR');
    expect(params.get('mode')).toBe('lockedDeposit');
    expect(params.get('p1')).toBe('Ana & Bo');
    expect(params.get('p1dep')).toBe('0.6');
  });

  it('returns null when there are no known parameters', () => {
    expect(stateFromQuery('')).toBeNull();
    expect(stateFromQuery('?utm_source=x')).toBeNull();
  });

  it('falls back to defaults for missing or invalid values', () => {
    const state = stateFromQuery('?price=abc&rate=99&term=0&cur=XYZ&mode=nope&fees=-5')!;
    const defaults = initialState();
    expect(state.homePrice).toBe(defaults.homePrice);
    expect(state.annualRatePercent).toBe(15);
    expect(state.termYears).toBe(1);
    expect(state.currency).toBe(defaults.currency);
    expect(state.equityMode).toBe(defaults.equityMode);
    expect(state.feesAddedToLoan).toBe(0);
    expect(state.people).toEqual(defaults.people);
  });

  it('reads people in order and stops at the first gap, up to three', () => {
    const state = stateFromQuery('?p1=A&p2=B&p4=D')!;
    expect(state.people.map((p) => p.name)).toEqual(['A', 'B']);
    expect(stateFromQuery('?p1=A&p2=B&p3=C')!.people.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('shares equally when a split is missing or does not add up', () => {
    const state = stateFromQuery('?p1=A&p2=B&p1dep=0.9&p2dep=0.9&p1pay=0.7')!;
    expect(state.people.map((p) => p.downPaymentShare)).toEqual([0.5, 0.5]);
    expect(state.people.map((p) => p.paymentShare)).toEqual([0.5, 0.5]);
  });

  it('keeps overpayment start within the term', () => {
    const state = stateFromQuery('?term=10&p1=A&p1over=100&p1from=500')!;
    expect(state.people[0].overpaymentStartMonth).toBe(120);
    expect(state.people[0].overpaymentMonthly).toBe(100);
  });
});
