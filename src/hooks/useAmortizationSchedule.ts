import { useMemo } from 'react';
import { computeSchedule } from '../calc';
import type { ScheduleResult } from '../calc/types';
import { toMortgageInputs, type AppState } from '../state/appState';

export function useAmortizationSchedule(state: AppState): ScheduleResult {
  return useMemo(() => computeSchedule(toMortgageInputs(state)), [state]);
}
