import type { ScheduleResult } from '../../calc/types';
import { formatCurrency, formatMonth, type CurrencyCode } from '../../format';

interface ResultsProps {
  result: ScheduleResult;
  currency: CurrencyCode;
}

export default function Results({ result, currency }: ResultsProps) {
  return (
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
  );
}
