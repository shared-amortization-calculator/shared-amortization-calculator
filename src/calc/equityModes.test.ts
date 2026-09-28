import { describe, expect, it } from 'vitest';
import { equityStrategies, type EquityInput } from './equityModes';
import { makePerson } from './fixtures';

const input: EquityInput = {
  people: [
    makePerson({ id: 'a', downPaymentShare: 0.5, ownershipShare: 0.7, principalShare: 0.25 }),
    makePerson({ id: 'b', downPaymentShare: 0.5, ownershipShare: 0.3, principalShare: 0.75 }),
  ],
  downPayment: 100,
  totalEquity: 400,
  principalRepaid: 300,
  cumulativeContributed: [600, 200],
  cumulativePrincipalPaid: [200, 100],
};

describe('equityStrategies', () => {
  it('proportional: total equity split by money paid in', () => {
    expect(equityStrategies.proportional(input)).toEqual([300, 100]);
  });

  it('proportional: equal split when nobody has paid anything', () => {
    const result = equityStrategies.proportional({
      ...input,
      totalEquity: 0,
      cumulativeContributed: [0, 0],
    });
    expect(result).toEqual([0, 0]);
  });

  it('fixed: total equity split by ownership shares', () => {
    const [a, b] = equityStrategies.fixed(input);
    expect(a).toBeCloseTo(280, 9);
    expect(b).toBeCloseTo(120, 9);
  });

  it('depositBaseline: own deposit plus own principal', () => {
    expect(equityStrategies.depositBaseline(input)).toEqual([250, 150]);
  });

  it('lockedDeposit: own deposit plus fixed share of principal repaid', () => {
    expect(equityStrategies.lockedDeposit(input)).toEqual([125, 275]);
  });
});
