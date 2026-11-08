import type { ReactElement } from 'react';
import { ReferenceArea } from 'recharts';
import type { ScheduleResult, ScheduleRow } from '../../calc/types';
import { capitalize, formatMonth } from '../../format';
import { lodgerPeriod } from '../../state/lodger';
import type { Column } from './DataTable';
import { TEXT_COLOR } from './theme';

const LODGER_FILL = '#e3e3e0';

// Plain functions rather than components, so Recharts sees the ReferenceArea as a direct child.
// The label goes where the chart is empty: top left over rising equity, bottom left under a falling balance.
export function lodgerArea(
  result: ScheduleResult,
  term: string,
  labelPosition: 'insideTopLeft' | 'insideBottomLeft',
): ReactElement | null {
  if (result.lodgerEndMonth === 0) return null;
  return (
    <ReferenceArea
      x1={0}
      x2={result.lodgerEndMonth}
      fill={LODGER_FILL}
      fillOpacity={1}
      zIndex={-50}
      label={{
        value: `${capitalize(term)}, ${lodgerPeriod(result)}`,
        position: labelPosition,
        fill: TEXT_COLOR,
      }}
    />
  );
}

export function lodgerColumns(result: ScheduleResult, term: string, money: (v: number) => string): Column[] {
  if (result.lodgerEndMonth === 0) return [];
  return [{ header: `${capitalize(term)} paid in`, value: (r: ScheduleRow) => money(r.cumulativeLodgerPaid) }];
}

export function lodgerSentence(result: ScheduleResult, term: string): string {
  if (result.lodgerEndMonth === 0) return '';
  return ` ${capitalize(term)} pays rent from the start to ${formatMonth(result.lodgerEndMonth)}.`;
}
