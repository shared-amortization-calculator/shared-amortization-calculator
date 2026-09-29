import { formatMonth } from '../../format';
import { PERSON_COLORS } from './theme';

export interface EndStat {
  name: string;
  values: { label?: string; value: string }[];
}

interface EndStatsProps {
  id: string;
  payoffMonth: number;
  stats: EndStat[];
}

export default function EndStats({ id, payoffMonth, stats }: EndStatsProps) {
  return (
    <div className="end-stats">
      <p className="end-stats-heading" data-testid={`${id}-end-heading`}>
        When the loan is repaid ({formatMonth(payoffMonth)})
      </p>
      <dl>
        {stats.map((s, k) => (
          <div key={k} style={{ borderLeftColor: PERSON_COLORS[k] }} data-testid={`${id}-end-${k}`}>
            <dt>{s.name}</dt>
            {s.values.map((v, i) => (
              <dd key={i}>
                {v.label && <span className="end-stats-label">{v.label} </span>}
                {v.value}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </div>
  );
}
