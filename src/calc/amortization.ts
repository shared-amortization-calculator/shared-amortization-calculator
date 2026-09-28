import type { MortgageInputs } from './types';

export const PAID_OFF_THRESHOLD = 0.005;

export interface LoanMonth {
  month: number;
  openingBalance: number;
  interest: number;
  regularPrincipal: number;
  overpaymentPrincipal: number;
  closingBalance: number;
  regularPayment: number;
  appliedOverpayments: number[];
}

export interface LoanSchedule {
  loanAmount: number;
  monthlyPayment: number;
  months: LoanMonth[];
}

export function monthlyPayment(loanAmount: number, annualRatePercent: number, termYears: number): number {
  const n = termYears * 12;
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return loanAmount / n;
  return (loanAmount * i) / (1 - Math.pow(1 + i, -n));
}

export function buildLoanSchedule(inputs: MortgageInputs): LoanSchedule {
  const loanAmount = inputs.homePrice - inputs.downPayment;
  const payment = monthlyPayment(loanAmount, inputs.annualRatePercent, inputs.termYears);
  const i = inputs.annualRatePercent / 100 / 12;
  const months: LoanMonth[] = [];
  let balance = loanAmount;
  let month = 0;

  while (balance >= PAID_OFF_THRESHOLD) {
    month += 1;
    const interest = balance * i;
    const regularPrincipal = Math.min(payment - interest, balance);
    const remaining = balance - regularPrincipal;
    const offered = inputs.people.map((p) =>
      month >= p.overpaymentStartMonth ? p.overpaymentMonthly : 0,
    );
    const totalOffered = offered.reduce((a, b) => a + b, 0);
    const overpaymentPrincipal = Math.min(totalOffered, remaining);
    const scale = totalOffered > 0 ? overpaymentPrincipal / totalOffered : 0;
    const closingBalance = remaining - overpaymentPrincipal;

    months.push({
      month,
      openingBalance: balance,
      interest,
      regularPrincipal,
      overpaymentPrincipal,
      closingBalance,
      regularPayment: interest + regularPrincipal,
      appliedOverpayments: offered.map((o) => o * scale),
    });
    balance = closingBalance;
  }

  return { loanAmount, monthlyPayment: payment, months };
}
