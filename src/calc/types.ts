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
  annualRatePercent: number;
  termYears: number;
  people: Person[];
  equityMode: EquityMode;
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
  people: PersonMonth[];
}

export interface ScheduleResult {
  monthlyPayment: number;
  totalInterest: number;
  payoffMonth: number;
  rows: ScheduleRow[];
}
