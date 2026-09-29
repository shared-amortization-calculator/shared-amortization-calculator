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
      feesAddedToLoan: 0,
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
  it('gives a re-added person a default name nobody else has', () => {
    const state = addPerson(removePerson(initialState(), 'p1'));
    expect(state.people.map((p) => p.name)).toEqual(['Person 2', 'Person 1']);
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

  it('passes fees added to the loan through', () => {
    const inputs = toMortgageInputs({ ...initialState(), feesAddedToLoan: 1500 });
    expect(inputs.feesAddedToLoan).toBe(1500);
  });
});
