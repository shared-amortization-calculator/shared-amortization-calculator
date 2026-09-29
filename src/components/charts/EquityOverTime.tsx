import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import { displayName } from '../../state/appState';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { equityData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import EndStats from './EndStats';
import { endLabel } from './endLabel';
import { GRID_COLOR, PERSON_COLORS, PERSON_DASHES, TEXT_COLOR } from './theme';

export default function EquityOverTime({ result, people, currency, animate }: ChartProps) {
  const data = equityData(result);
  const lastIndex = data.length - 1;
  const names = people.map(displayName);
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);
  const summary =
    `Stacked area chart of each person's equity from the start to ${formatMonth(result.payoffMonth)}. ` +
    `Final equity: ${names.map((n, k) => `${n} ${formatCurrency(final.people[k].equity, currency, { whole: true })}`).join(', ')}.`;

  return (
    <ChartFigure
      id="equity"
      title="Equity over time"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
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
            <Legend />
            {people.map((p, k) => (
              <Area
                key={p.id}
                type="linear"
                dataKey={p.id}
                name={names[k]}
                stackId="equity"
                stroke={PERSON_COLORS[k]}
                strokeWidth={2}
                strokeDasharray={PERSON_DASHES[k]}
                fill={PERSON_COLORS[k]}
                fillOpacity={0.25}
                isAnimationActive={animate}
                label={endLabel(names[k], lastIndex, PERSON_COLORS[k])}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      }
      stats={
        <EndStats
          id="equity"
          payoffMonth={result.payoffMonth}
          stats={names.map((n, k) => ({ name: n, values: [{ value: money(final.people[k].equity) }] }))}
        />
      }
      table={
        <DataTable
          caption="Equity by year"
          rows={yearlyRows(result)}
          columns={[
            ...names.map((n, k) => ({ header: n, value: (r: ScheduleRow) => money(r.people[k].equity) })),
            { header: 'Total', value: (r: ScheduleRow) => money(r.totalEquity) },
          ]}
        />
      }
    />
  );
}
