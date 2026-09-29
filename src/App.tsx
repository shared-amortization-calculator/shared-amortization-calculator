import { useEffect, useState } from 'react';
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
import ShareControls from './components/ShareControls';
import WarrantyNotice from './components/WarrantyNotice';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { initialState, type AppState } from './state/appState';
import { stateFromQuery, stateToQuery } from './state/urlState';

const URL_UPDATE_DELAY_MS = 300;

// The defaults get a bare URL, so a fresh page stays clean.
function locationFor(state: AppState): string {
  const query = stateToQuery(state);
  const search = query === stateToQuery(initialState()) ? '' : `?${query}`;
  return `${window.location.pathname}${search}${window.location.hash}`;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => stateFromQuery(window.location.search) ?? initialState());
  const result = useAmortizationSchedule(state);
  const animate = !usePrefersReducedMotion();
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const chartProps = { result, people: state.people, currency: state.currency, animate };
  const shareUrl = `${window.location.origin}${window.location.pathname}?${stateToQuery(state)}`;

  useEffect(() => {
    const timer = setTimeout(() => window.history.replaceState(null, '', locationFor(state)), URL_UPDATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const reset = () => {
    setState(initialState());
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  };

  return (
    <>
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <DisclaimerBanner />
      <header className="site-header page">
        <h1 id="app-title">Mortgage Split</h1>
        <div className="header-controls">
          <CurrencySelector value={state.currency} onChange={(currency) => patch({ currency })} />
          <ShareControls shareUrl={shareUrl} onReset={reset} />
        </div>
      </header>
      <main id="main" className="page">
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} monthlyPayment={result.monthlyPayment} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <section id="results" tabIndex={-1} aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <WarrantyNotice />
          <Results result={result} currency={state.currency} />
          <ContributedVsEquity {...chartProps} />
          <EquityOverTime {...chartProps} />
          <BalanceOverTime {...chartProps} />
        </section>
      </main>
      <Footer />
    </>
  );
}
