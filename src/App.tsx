import { useRef, useState } from 'react';
import BalanceOverTime from './components/charts/BalanceOverTime';
import ContributedVsEquity from './components/charts/ContributedVsEquity';
import EquityOverTime from './components/charts/EquityOverTime';
import CurrencySelector from './components/CurrencySelector';
import DisclaimerBanner from './components/DisclaimerBanner';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import Footer from './components/Footer';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { initialState, type AppState } from './state/appState';

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const result = useAmortizationSchedule(state);
  const animate = !usePrefersReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const chartProps = { result, people: state.people, currency: state.currency, animate };

  return (
    <>
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <DisclaimerBanner onDismiss={() => titleRef.current?.focus()} />
      <header className="site-header page">
        <h1 id="app-title" ref={titleRef} tabIndex={-1}>
          Shared Amortization Calculator
        </h1>
        <CurrencySelector value={state.currency} onChange={(currency) => patch({ currency })} />
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} monthlyPayment={result.monthlyPayment} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <Results result={result} currency={state.currency} />
          <EquityOverTime {...chartProps} />
          <BalanceOverTime {...chartProps} />
          <ContributedVsEquity {...chartProps} />
        </section>
      </main>
      <Footer />
    </>
  );
}
