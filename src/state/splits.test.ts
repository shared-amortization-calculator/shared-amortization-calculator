import { describe, expect, it } from 'vitest';
import { makePerson } from '../calc/fixtures';
import { equalizeShares, setShare, shareFromAmount } from './splits';

function withDownShares(shares: number[]) {
  return shares.map((s, k) => makePerson({ id: `p${k + 1}`, downPaymentShare: s }));
}

const downShares = (people: ReturnType<typeof withDownShares>) => people.map((p) => p.downPaymentShare);

describe('equalizeShares', () => {
  it('gives everyone an equal share of every split', () => {
    const [a, b, c] = equalizeShares(withDownShares([0.7, 0.2, 0.1]));
    for (const p of [a, b, c]) {
      expect(p.downPaymentShare).toBeCloseTo(1 / 3, 12);
      expect(p.paymentShare).toBeCloseTo(1 / 3, 12);
      expect(p.ownershipShare).toBeCloseTo(1 / 3, 12);
      expect(p.principalShare).toBeCloseTo(1 / 3, 12);
    }
  });
});

describe('setShare', () => {
  it('sets a share and gives the remainder to the last person', () => {
    const [a, b] = downShares(setShare(withDownShares([0.5, 0.5]), 'downPaymentShare', 0, 0.7));
    expect(a).toBe(0.7);
    expect(b).toBeCloseTo(0.3, 12);
  });

  it('adjusts a middle person and recomputes the remainder', () => {
    const result = downShares(setShare(withDownShares([0.5, 0.3, 0.2]), 'downPaymentShare', 1, 0.1));
    expect(result[0]).toBe(0.5);
    expect(result[1]).toBe(0.1);
    expect(result[2]).toBeCloseTo(0.4, 12);
  });

  it('clamps so the non-last shares never exceed 100%', () => {
    const result = downShares(setShare(withDownShares([0.5, 0.3, 0.2]), 'downPaymentShare', 0, 0.8));
    expect(result[0]).toBeCloseTo(0.7, 12);
    expect(result[1]).toBe(0.3);
    expect(result[2]).toBeCloseTo(0, 12);
  });

  it('clamps negative values to zero', () => {
    expect(downShares(setShare(withDownShares([0.5, 0.5]), 'downPaymentShare', 0, -0.2))).toEqual([0, 1]);
  });

  it('ignores the last person and out-of-range indexes', () => {
    const people = withDownShares([0.5, 0.5]);
    expect(setShare(people, 'downPaymentShare', 1, 0.9)).toBe(people);
    expect(setShare(people, 'downPaymentShare', 5, 0.9)).toBe(people);
  });

  it('leaves the other splits untouched', () => {
    const people = equalizeShares(withDownShares([0.5, 0.5]));
    const result = setShare(people, 'downPaymentShare', 0, 0.9);
    expect(result.map((p) => p.paymentShare)).toEqual([0.5, 0.5]);
  });
});

describe('shareFromAmount', () => {
  it('turns an amount into a fraction of the total', () => {
    expect(shareFromAmount(7500, 30000)).toBe(0.25);
  });

  it('returns null when the total is zero, since no share can be derived', () => {
    expect(shareFromAmount(100, 0)).toBeNull();
  });

  it('lets setShare cap an amount larger than what is left', () => {
    const people = setShare(withDownShares([0.5, 0.5]), 'downPaymentShare', 0, shareFromAmount(45000, 30000)!);
    expect(downShares(people)).toEqual([1, 0]);
  });
});
