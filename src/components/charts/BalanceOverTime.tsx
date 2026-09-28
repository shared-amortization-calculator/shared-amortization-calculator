import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { balanceData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import { GRID_COLOR, TEXT_COLOR } from './theme';

export default function BalanceOverTime({ result, currency, animate }: ChartProps) {
  const money = (v: number) => formatCurrency(v, currency);
  const opening = result.rows[0].closingBalance;
  const summary =
    `Line chart of the loan balance falling from ${formatCurrency(opening, currency, { whole: true })} ` +
    `to zero by ${formatMonth(result.payoffMonth)}.`;

  return (
    <ChartFigure
      id="balance"
      title="Loan balance over time"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={balanceData(result)} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, result.payoffMonth]}
              ticks={yearTicks(result.payoffMonth)}
              tickFormatter={(m: number) => (m === 0 ? 'Start' : `Year ${m / 12}`)}
              tick={{ fill: TEXT_COLOR }}
            />
            <YAxis
              width={72}
              tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })}
              tick={{ fill: TEXT_COLOR }}
            />
            <Tooltip labelFormatter={(m) => formatMonth(Number(m))} formatter={(v) => money(Number(v))} />
            <Line
              type="linear"
              dataKey="balance"
              name="Loan balance"
              stroke={TEXT_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
          </LineChart>
        </ResponsiveContainer>
      }
      table={
        <DataTable
          caption="Loan balance by year"
          rows={yearlyRows(result)}
          columns={[{ header: 'Loan balance', value: (r: ScheduleRow) => money(r.closingBalance) }]}
        />
      }
    />
  );
}
