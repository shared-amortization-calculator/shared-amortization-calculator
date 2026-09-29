import type { EquityMode, Person } from './types';

export interface EquityInput {
  people: Person[];
  netDeposit: number;
  totalEquity: number;
  principalRepaid: number;
  cumulativeContributed: number[];
  cumulativePrincipalPaid: number[];
}

export type EquityStrategy = (input: EquityInput) => number[];

const proportional: EquityStrategy = ({ people, totalEquity, cumulativeContributed }) => {
  const total = cumulativeContributed.reduce((a, b) => a + b, 0);
  if (total === 0) return people.map(() => totalEquity / people.length);
  return cumulativeContributed.map((c) => (totalEquity * c) / total);
};

const fixed: EquityStrategy = ({ people, totalEquity }) =>
  people.map((p) => totalEquity * p.ownershipShare);

const depositBaseline: EquityStrategy = ({ people, netDeposit, cumulativePrincipalPaid }) =>
  people.map((p, k) => netDeposit * p.downPaymentShare + cumulativePrincipalPaid[k]);

const lockedDeposit: EquityStrategy = ({ people, netDeposit, principalRepaid }) =>
  people.map((p) => netDeposit * p.downPaymentShare + principalRepaid * p.principalShare);

export const equityStrategies: Record<EquityMode, EquityStrategy> = {
  proportional,
  fixed,
  depositBaseline,
  lockedDeposit,
};
