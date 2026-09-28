import type { ScheduleResult, ScheduleRow } from '../../calc/types';

export type ChartPoint = { month: number } & Record<string, number>;

export function equityData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({
    month: row.month,
    ...Object.fromEntries(row.people.map((p) => [p.personId, p.equity])),
  }));
}

export function balanceData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({ month: row.month, balance: row.closingBalance }));
}

export function contributedData(result: ScheduleResult): ChartPoint[] {
  return result.rows.map((row) => ({
    month: row.month,
    ...Object.fromEntries(
      row.people.flatMap((p) => [
        [`${p.personId}_paid`, p.cumulativeContributed],
        [`${p.personId}_equity`, p.equity],
      ]),
    ),
  }));
}

export function yearlyRows(result: ScheduleResult): ScheduleRow[] {
  return result.rows.filter((row) => row.month % 12 === 0 || row.month === result.payoffMonth);
}

export function yearTicks(payoffMonth: number): number[] {
  const years = Math.ceil(payoffMonth / 12);
  const step = years > 20 ? 5 : years > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let year = 0; year <= years; year += step) {
    if (year * 12 <= payoffMonth) ticks.push(year * 12);
  }
  return ticks;
}
