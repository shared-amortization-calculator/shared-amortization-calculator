export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  downPaymentShare: number;
  paymentShare: number;
  ownershipShare: number;
  principalShare: number;
  overpaymentMonthly: number;
  overpaymentStartMonth: number;
}

export type EquityMode = 'proportional' | 'fixed' | 'depositBaseline' | 'lockedDeposit';

export interface MortgageInputs {
  homePrice: number;
  downPayment: number;
  feesAddedToLoan: number;
  annualRatePercent: number;
  termYears: number;
  people: Person[];
  equityMode: EquityMode;
  lodgerRentMonthly: number;
  lodgerMonths: number;
}

export interface PersonMonth {
  personId: PersonId;
  paidThisMonth: number;
  cumulativeContributed: number;
  equity: number;
}

export interface ScheduleRow {
  month: number;
  openingBalance: number;
  interest: number;
  regularPrincipal: number;
  overpaymentPrincipal: number;
  closingBalance: number;
  totalEquity: number;
  lodgerPaid: number;
  cumulativeLodgerPaid: number;
  people: PersonMonth[];
}

export interface ScheduleResult {
  monthlyPayment: number;
  totalInterest: number;
  payoffMonth: number;
  totalLodgerPaid: number;
  // The last month with lodger rent applied, or 0 when there is none.
  lodgerEndMonth: number;
  rows: ScheduleRow[];
}
