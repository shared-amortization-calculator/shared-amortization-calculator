import type { Person } from '../calc/types';

export type ShareKey = 'downPaymentShare' | 'paymentShare' | 'ownershipShare' | 'principalShare';

export function equalizeShares(people: Person[]): Person[] {
  const share = 1 / people.length;
  return people.map((p) => ({
    ...p,
    downPaymentShare: share,
    paymentShare: share,
    ownershipShare: share,
    principalShare: share,
  }));
}

export function setShare(people: Person[], key: ShareKey, index: number, fraction: number): Person[] {
  const last = people.length - 1;
  if (index < 0 || index >= last) return people;
  const others = people.reduce((sum, p, k) => (k === index || k === last ? sum : sum + p[key]), 0);
  const clamped = Math.min(Math.max(fraction, 0), 1 - others);
  const updated = people.map((p, k) => (k === index ? { ...p, [key]: clamped } : p));
  const nonLastTotal = updated.reduce((sum, p, k) => (k === last ? sum : sum + p[key]), 0);
  return updated.map((p, k) => (k === last ? { ...p, [key]: Math.max(0, 1 - nonLastTotal) } : p));
}

export function shareFromAmount(amount: number, total: number): number | null {
  return total > 0 ? amount / total : null;
}
