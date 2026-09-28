import type { ScheduleRow } from '../../calc/types';
import { formatMonth } from '../../format';

export interface Column {
  header: string;
  value: (row: ScheduleRow) => string;
}

interface DataTableProps {
  caption: string;
  rows: ScheduleRow[];
  columns: Column[];
}

export default function DataTable({ caption, rows, columns }: DataTableProps) {
  return (
    <div className="table-wrap" role="region" aria-label={`${caption} (scrollable)`} tabIndex={0}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            {columns.map((c, index) => (
              <th key={index} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonth(row.month)}</th>
              {columns.map((c, index) => (
                <td key={index}>{c.value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
