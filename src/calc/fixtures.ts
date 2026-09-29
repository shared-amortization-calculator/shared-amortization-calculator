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
    feesAddedToLoan: 0,
    annualRatePercent: 6,
    termYears: 30,
    people: [makePerson()],
    equityMode: 'proportional',
    ...overrides,
  };
}
