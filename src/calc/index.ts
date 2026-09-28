import { buildLoanSchedule } from './amortization';
import { equityStrategies } from './equityModes';
import type { MortgageInputs, ScheduleResult, ScheduleRow } from './types';

type LoanFields = Omit<ScheduleRow, 'totalEquity' | 'people'>;

export function computeSchedule(inputs: MortgageInputs): ScheduleResult {
  const { people, downPayment, homePrice } = inputs;
  const strategy = equityStrategies[inputs.equityMode];
  const loan = buildLoanSchedule(inputs);
  const contributed = people.map((p) => downPayment * p.downPaymentShare);
  const principalPaid = people.map(() => 0);

  const makeRow = (fields: LoanFields, paid: number[]): ScheduleRow => {
    const totalEquity = homePrice - fields.closingBalance;
    const equity = strategy({
      people,
      downPayment,
      totalEquity,
      principalRepaid: loan.loanAmount - fields.closingBalance,
      cumulativeContributed: [...contributed],
      cumulativePrincipalPaid: [...principalPaid],
    });
    return {
      ...fields,
      totalEquity,
      people: people.map((p, k) => ({
        personId: p.id,
        paidThisMonth: paid[k],
        cumulativeContributed: contributed[k],
        equity: equity[k],
      })),
    };
  };

  const rows: ScheduleRow[] = [
    makeRow(
      {
        month: 0,
        openingBalance: loan.loanAmount,
        interest: 0,
        regularPrincipal: 0,
        overpaymentPrincipal: 0,
        closingBalance: loan.loanAmount,
      },
      people.map(() => 0),
    ),
  ];

  let totalInterest = 0;
  for (const m of loan.months) {
    totalInterest += m.interest;
    const paid = people.map((p, k) => p.paymentShare * m.regularPayment + m.appliedOverpayments[k]);
    people.forEach((p, k) => {
      contributed[k] += paid[k];
      principalPaid[k] += p.paymentShare * m.regularPrincipal + m.appliedOverpayments[k];
    });
    rows.push(
      makeRow(
        {
          month: m.month,
          openingBalance: m.openingBalance,
          interest: m.interest,
          regularPrincipal: m.regularPrincipal,
          overpaymentPrincipal: m.overpaymentPrincipal,
          closingBalance: m.closingBalance,
        },
        paid,
      ),
    );
  }

  return {
    monthlyPayment: loan.monthlyPayment,
    totalInterest,
    payoffMonth: loan.months.length,
    rows,
  };
}
