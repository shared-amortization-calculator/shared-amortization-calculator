import type { EquityMode, Person } from '../calc/types';
import { CURRENCIES } from '../format';
import { initialState, MAX_PEOPLE, type AppState } from './appState';
import { equalizeShares, type ShareKey } from './splits';

const EQUITY_MODES: EquityMode[] = ['proportional', 'fixed', 'depositBaseline', 'lockedDeposit'];

const SHARE_PARAMS: [ShareKey, string][] = [
  ['downPaymentShare', 'dep'],
  ['paymentShare', 'pay'],
  ['ownershipShare', 'own'],
  ['principalShare', 'prin'],
];

const MAX_NAME_LENGTH = 100;

// Numbers use String() so every value reads back exactly.
export function stateToQuery(state: AppState): string {
  const params = new URLSearchParams({
    price: String(state.homePrice),
    deposit: String(state.downPaymentPercent),
    fees: String(state.feesAddedToLoan),
    rate: String(state.annualRatePercent),
    term: String(state.termYears),
    cur: state.currency,
    mode: state.equityMode,
  });
  state.people.forEach((person, k) => {
    const p = `p${k + 1}`;
    params.set(p, person.name);
    for (const [key, suffix] of SHARE_PARAMS) params.set(p + suffix, String(person[key]));
    params.set(`${p}over`, String(person.overpaymentMonthly));
    params.set(`${p}from`, String(person.overpaymentStartMonth));
  });
  return params.toString();
}

function readNumber(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max = Infinity,
  integer = false,
): number {
  const raw = params.get(name);
  const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.min(Math.max(value, min), max);
  return integer ? Math.round(clamped) : clamped;
}

function readShares(params: URLSearchParams, people: Person[]): Person[] {
  let result = people;
  for (const [key, suffix] of SHARE_PARAMS) {
    const values = people.map((_, k) => Number(params.get(`p${k + 1}${suffix}`) ?? NaN));
    const valid = values.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
    const total = values.reduce((sum, v) => sum + v, 0);
    if (!valid || Math.abs(total - 1) > 1e-9) {
      const equal = equalizeShares(people);
      result = result.map((p, k) => ({ ...p, [key]: equal[k][key] }));
    } else {
      result = result.map((p, k) => ({ ...p, [key]: values[k] }));
    }
  }
  return result;
}

// Returns null when the query has none of our parameters.
export function stateFromQuery(search: string): AppState | null {
  const params = new URLSearchParams(search);
  const defaults = initialState();
  const known = ['price', 'deposit', 'fees', 'rate', 'term', 'cur', 'mode', 'p1'];
  if (!known.some((name) => params.has(name))) return null;

  const termYears = readNumber(params, 'term', defaults.termYears, 1, 40, true);
  const cur = params.get('cur');
  const mode = params.get('mode');

  const people: Person[] = [];
  for (let k = 0; k < MAX_PEOPLE; k++) {
    const p = `p${k + 1}`;
    const name = params.get(p);
    if (name === null) break;
    const base = defaults.people[0];
    people.push({
      ...base,
      id: p,
      name: name.slice(0, MAX_NAME_LENGTH),
      overpaymentMonthly: readNumber(params, `${p}over`, base.overpaymentMonthly, 0),
      overpaymentStartMonth: readNumber(params, `${p}from`, base.overpaymentStartMonth, 1, termYears * 12, true),
    });
  }

  return {
    homePrice: readNumber(params, 'price', defaults.homePrice, 0),
    downPaymentPercent: readNumber(params, 'deposit', defaults.downPaymentPercent, 0, 99.5),
    feesAddedToLoan: readNumber(params, 'fees', defaults.feesAddedToLoan, 0),
    annualRatePercent: readNumber(params, 'rate', defaults.annualRatePercent, 0, 15),
    termYears,
    people: people.length > 0 ? readShares(params, people) : defaults.people,
    equityMode: EQUITY_MODES.find((m) => m === mode) ?? defaults.equityMode,
    currency: CURRENCIES.find((c) => c.code === cur)?.code ?? defaults.currency,
  };
}
