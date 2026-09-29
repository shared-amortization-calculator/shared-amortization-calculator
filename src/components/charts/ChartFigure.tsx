import { useState, type ReactNode } from 'react';
import type { Person, ScheduleResult } from '../../calc/types';
import type { CurrencyCode } from '../../format';

export interface ChartProps {
  result: ScheduleResult;
  people: Person[];
  currency: CurrencyCode;
  animate: boolean;
}

interface ChartFigureProps {
  id: string;
  title: string;
  summary: string;
  chart: ReactNode;
  stats?: ReactNode;
  table: ReactNode;
}

export default function ChartFigure({ id, title, summary, chart, stats, table }: ChartFigureProps) {
  const [showTable, setShowTable] = useState(false);
  const captionId = `${id}-caption`;
  const tableId = `${id}-table`;

  return (
    <figure aria-labelledby={captionId}>
      <figcaption id={captionId}>{title}</figcaption>
      <div className="chart" role="img" aria-label={summary}>
        {chart}
      </div>
      {stats}
      <button
        type="button"
        className="secondary"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? 'Hide' : 'Show'} data table<span className="visually-hidden"> for {title}</span>
      </button>
      <div id={tableId} hidden={!showTable}>
        {table}
      </div>
    </figure>
  );
}
