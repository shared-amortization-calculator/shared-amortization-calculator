import type { EquityMode, MortgageInputs, Person } from '../calc/types';
import type { CurrencyCode } from '../format';
import { equalizeShares } from './splits';

export const MAX_PEOPLE = 3;
const PERSON_IDS = ['p1', 'p2', 'p3'];

export interface AppState {
  homePrice: number;
  downPaymentPercent: number;
  feesAddedToLoan: number;
  annualRatePercent: number;
  termYears: number;
  people: Person[];
  equityMode: EquityMode;
  currency: CurrencyCode;
}

function createPerson(id: string, name: string): Person {
  return {
    id,
    name,
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
    feesAddedToLoan: 0,
    annualRatePercent: 4.5,
    termYears: 25,
    people: equalizeShares([createPerson('p1', 'Person 1'), createPerson('p2', 'Person 2')]),
    equityMode: 'proportional',
    currency: 'GBP',
  };
}

export function addPerson(state: AppState): AppState {
  if (state.people.length >= MAX_PEOPLE) return state;
  const id = PERSON_IDS.find((candidate) => !state.people.some((p) => p.id === candidate))!;
  const taken = new Set(state.people.map((p, k) => displayName(p, k)));
  let n = 1;
  while (taken.has(`Person ${n}`)) n += 1;
  return {
    ...state,
    people: equalizeShares([...state.people, createPerson(id, `Person ${n}`)]),
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
    feesAddedToLoan: state.feesAddedToLoan,
    annualRatePercent: state.annualRatePercent,
    termYears: state.termYears,
    people: state.people,
    equityMode: state.equityMode,
  };
}
