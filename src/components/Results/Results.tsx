import type { Person, ScheduleResult } from '../../calc/types';
import { formatCurrency, formatMonth, type CurrencyCode } from '../../format';
import { displayName } from '../../state/appState';
import EndStats from '../charts/EndStats';

interface ResultsProps {
  result: ScheduleResult;
  people: Person[];
  currency: CurrencyCode;
}

export default function Results({ result, people, currency }: ResultsProps) {
  const final = result.rows[result.rows.length - 1];
  const money = (v: number) => formatCurrency(v, currency);

  return (
    <>
      <div aria-live="polite" aria-atomic="true">
        <dl className="headline">
          <div>
            <dt>Monthly payment</dt>
            <dd data-testid="monthly-payment">{formatCurrency(result.monthlyPayment, currency)}</dd>
          </div>
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
      <EndStats
        id="repaid"
        payoffMonth={result.payoffMonth}
        stats={people.map((p, k) => ({
          name: displayName(p, k),
          values: [
            { label: 'Paid in', value: money(final.people[k].cumulativeContributed) },
            { label: 'Equity', value: money(final.people[k].equity) },
          ],
        }))}
      />
    </>
  );
}
