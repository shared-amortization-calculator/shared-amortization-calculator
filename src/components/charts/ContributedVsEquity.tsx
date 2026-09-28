import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleRow } from '../../calc/types';
import { formatCurrency, formatMonth } from '../../format';
import { displayName } from '../../state/appState';
import ChartFigure, { type ChartProps } from './ChartFigure';
import { contributedData, yearlyRows, yearTicks } from './chartData';
import DataTable from './DataTable';
import { endLabel } from './endLabel';
import { GRID_COLOR, PAID_IN_DASH, PERSON_COLORS, TEXT_COLOR } from './theme';

export default function ContributedVsEquity({ result, people, currency, animate }: ChartProps) {
  const data = contributedData(result);
  const lastIndex = data.length - 1;
  const names = people.map(displayName);
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);
  const whole = (v: number) => formatCurrency(v, currency, { whole: true });
  const summary =
    `Line chart comparing the money each person has paid in with their equity. By ${formatMonth(result.payoffMonth)}: ` +
    names
      .map((n, k) => `${n} paid in ${whole(final.people[k].cumulativeContributed)} and has ${whole(final.people[k].equity)} equity`)
      .join('; ') +
    '.';

  return (
    <ChartFigure
      id="contributed"
      title="Paid in versus equity"
      summary={summary}
      chart={
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} accessibilityLayer={false} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
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
            {people.flatMap((p, k) => [
              <Line
                key={`${p.id}_paid`}
                type="linear"
                dataKey={`${p.id}_paid`}
                name={`${names[k]} paid in`}
                stroke={PERSON_COLORS[k]}
                strokeWidth={2}
                strokeDasharray={PAID_IN_DASH}
                dot={false}
                isAnimationActive={animate}
                label={endLabel(`${names[k]} paid in`, lastIndex, PERSON_COLORS[k])}
              />,
              <Line
                key={`${p.id}_equity`}
                type="linear"
                dataKey={`${p.id}_equity`}
                name={`${names[k]} equity`}
                stroke={PERSON_COLORS[k]}
                strokeWidth={3}
                dot={false}
                isAnimationActive={animate}
                label={endLabel(`${names[k]} equity`, lastIndex, PERSON_COLORS[k])}
              />,
            ])}
          </LineChart>
        </ResponsiveContainer>
      }
      table={
        <DataTable
          caption="Paid in and equity by year"
          rows={yearlyRows(result)}
          columns={names.flatMap((n, k) => [
            { header: `${n} paid in`, value: (r: ScheduleRow) => money(r.people[k].cumulativeContributed) },
            { header: `${n} equity`, value: (r: ScheduleRow) => money(r.people[k].equity) },
          ])}
        />
      }
    />
  );
}
