import type { ScheduleResult } from '../calc/types';
import type { AppState } from './appState';

// Ticked with a rent of zero behaves exactly like unticked.
export function lodgerActive(state: AppState): boolean {
  return state.lodgerEnabled && state.lodgerRentMonthly > 0;
}

// What the people share each month while the lodger pays.
export function paymentAfterLodger(monthlyPayment: number, state: AppState): number {
  if (!lodgerActive(state)) return monthlyPayment;
  return monthlyPayment - Math.min(state.lodgerRentMonthly, monthlyPayment);
}

export function lodgerCoversLoan(result: ScheduleResult): boolean {
  return result.lodgerEndMonth > 0 && result.lodgerEndMonth >= result.payoffMonth;
}

export function lodgerPeriod(result: ScheduleResult): string {
  return lodgerCoversLoan(result) ? 'whole loan' : `months 1–${result.lodgerEndMonth}`;
}
