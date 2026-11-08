import { useEffect, useState } from 'react';
import BalanceOverTime from './components/charts/BalanceOverTime';
import ContributedVsEquity from './components/charts/ContributedVsEquity';
import EquityOverTime from './components/charts/EquityOverTime';
import CurrencySelector from './components/CurrencySelector';
import DisclaimerBanner from './components/DisclaimerBanner';
import EquityModeSelector from './components/EquityModeSelector/EquityModeSelector';
import Footer from './components/Footer';
import IntroNotice from './components/IntroNotice';
import JumpToResults from './components/JumpToResults';
import MortgageForm from './components/MortgageForm/MortgageForm';
import PeopleControls from './components/PeopleControls/PeopleControls';
import Results from './components/Results/Results';
import ShareControls from './components/ShareControls';
import WarrantyNotice from './components/WarrantyNotice';
import { useAmortizationSchedule } from './hooks/useAmortizationSchedule';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useStoredFlag } from './hooks/useStoredFlag';
import { lodgerTerm } from './format';
import { initialState, type AppState } from './state/appState';
import { lodgerActive, paymentAfterLodger } from './state/lodger';
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
  const [pinResults, setPinResults] = useStoredFlag('keepResultsInView');
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));
  const chartProps = { result, people: state.people, currency: state.currency, animate, lodgerTerm: lodgerTerm(state.currency) };
  const lodger = lodgerActive(state)
    ? { term: lodgerTerm(state.currency), afterRent: paymentAfterLodger(result.monthlyPayment, state) }
    : null;
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
      <DisclaimerBanner />
      <header className="site-header page">
        <h1 id="app-title">Mortgage Split</h1>
        <div className="header-controls">
          <CurrencySelector value={state.currency} onChange={(currency) => patch({ currency })} />
          <ShareControls shareUrl={shareUrl} onReset={reset} />
        </div>
      </header>
      <main id="main" className="page">
        <IntroNotice />
        <MortgageForm state={state} onPatch={patch} />
        <PeopleControls state={state} result={result} update={setState} />
        <EquityModeSelector state={state} update={setState} />
        <WarrantyNotice />
        {/* The summary is its own section, a direct child of main, so when pinned it can stick
            to the bottom of the viewport all the way up the form. The charts follow it. */}
        <section
          id="results"
          className={pinResults ? 'results results--pinned' : 'results'}
          aria-labelledby="results-heading"
        >
          <div className="results-heading-row">
            <h2 id="results-heading">Results</h2>
            <label className="pin-results">
              <input type="checkbox" checked={pinResults} onChange={(e) => setPinResults(e.target.checked)} />
              Keep results in view
            </label>
          </div>
          <Results result={result} people={state.people} currency={state.currency} lodger={lodger} />
        </section>
        <ContributedVsEquity {...chartProps} />
        <EquityOverTime {...chartProps} />
        <BalanceOverTime {...chartProps} />
      </main>
      <JumpToResults targetId="warranty" />
      <Footer />
    </>
  );
}
