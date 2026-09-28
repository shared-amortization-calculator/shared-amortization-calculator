import { useState } from 'react';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

  return (
    <>
      <header className="site-header page">
        <h1 id="app-title">Shared Amortization Calculator</h1>
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
        </section>
      </main>
    </>
  );
}
