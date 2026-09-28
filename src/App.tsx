import { useState } from 'react';
import MortgageForm from './components/MortgageForm/MortgageForm';
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
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
        </section>
      </main>
    </>
  );
}
