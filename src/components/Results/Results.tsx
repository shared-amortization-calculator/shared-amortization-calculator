import type { Person, ScheduleResult } from '../../calc/types';
import { capitalize, formatCurrency, formatMonth, type CurrencyCode } from '../../format';
import { displayName } from '../../state/appState';
import { lodgerPeriod } from '../../state/lodger';
import EndStats, { type EndStat } from '../charts/EndStats';
import { LODGER_COLOR } from '../charts/theme';

interface ResultsProps {
  result: ScheduleResult;
  people: Person[];
  currency: CurrencyCode;
  // Null unless there is a lodger paying rent.
  lodger: { term: string; afterRent: number } | null;
}

export default function Results({ result, people, currency, lodger }: ResultsProps) {
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);
  const stats: EndStat[] = people.map((p, k) => ({
    name: displayName(p, k),
    values: [
      { label: 'Paid in', value: money(final.people[k].cumulativeContributed) },
      { label: 'Equity', value: money(final.people[k].equity) },
    ],
  }));
  if (lodger) {
    stats.push({
      name: capitalize(lodger.term),
      color: LODGER_COLOR,
      values: [
        { label: 'Paid in', value: money(result.totalLodgerPaid) },
        { label: 'Equity', value: 'none' },
      ],
    });
  }

  return (
    <>
      <div aria-live="polite" aria-atomic="true">
        <dl className="headline">
          <div>
            <dt>Monthly payment</dt>
            <dd data-testid="monthly-payment">{formatCurrency(result.monthlyPayment, currency)}</dd>
          </div>
          {lodger && (
            <div>
              <dt>After {lodger.term} rent</dt>
              <dd data-testid="after-lodger-payment">
                {formatCurrency(lodger.afterRent, currency)}
                <small className="headline-note">{lodgerPeriod(result)}</small>
              </dd>
            </div>
          )}
          <div>
            <dt>Total interest</dt>
            <dd data-testid="total-interest">{formatCurrency(result.totalInterest, currency)}</dd>
          </div>
          <div>
            <dt>Paid off</dt>
            <dd data-testid="payoff">{formatMonth(result.payoffMonth)}</dd>
          </div>
        </dl>
      </div>
      <EndStats id="repaid" payoffMonth={result.payoffMonth} stats={stats} />
    </>
  );
}
