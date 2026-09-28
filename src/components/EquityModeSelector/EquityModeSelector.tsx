import SplitControl from '../SplitControl';
import type { EquityMode, Person } from '../../calc/types';
import type { AppState } from '../../state/appState';

const MODES: { mode: EquityMode; label: string; description: string }[] = [
  {
    mode: 'proportional',
    label: 'Proportional to money paid in',
    description:
      "Each person's share of the equity matches their share of all the money paid in so far, including the deposit and interest.",
  },
  {
    mode: 'fixed',
    label: 'Fixed ownership shares',
    description: 'Equity is split by fixed shares you set, whoever pays.',
  },
  {
    mode: 'depositBaseline',
    label: 'Deposit, plus principal each person repays',
    description: 'Each person owns their deposit plus the loan they have repaid. Interest does not count.',
  },
  {
    mode: 'lockedDeposit',
    label: 'Deposit locked in, remaining loan split by fixed shares',
    description: 'Each person owns their deposit. The loan repaid is split by fixed shares you set.',
  },
];

interface EquityModeSelectorProps {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function EquityModeSelector({ state, update }: EquityModeSelectorProps) {
  const setPeople = (people: Person[]) => update((s) => ({ ...s, people }));

  return (
    <section aria-labelledby="equity-heading">
      <h2 id="equity-heading">How equity is shared</h2>
      <fieldset>
        <legend>Equity rule</legend>
        {MODES.map(({ mode, label, description }) => {
          const id = `mode-${mode}`;
          return (
            <div key={mode} className="radio-option">
              <input
                id={id}
                type="radio"
                name="equity-mode"
                value={mode}
                checked={state.equityMode === mode}
                aria-describedby={`${id}-desc`}
                onChange={() => update((s) => ({ ...s, equityMode: mode }))}
              />
              <div>
                <label htmlFor={id}>{label}</label>
                <p id={`${id}-desc`}>{description}</p>
              </div>
            </div>
          );
        })}
      </fieldset>
      {state.equityMode === 'fixed' && (
        <SplitControl legend="Ownership shares" people={state.people} shareKey="ownershipShare" onChange={setPeople} />
      )}
      {state.equityMode === 'lockedDeposit' && (
        <SplitControl legend="Split of loan repaid" people={state.people} shareKey="principalShare" onChange={setPeople} />
      )}
    </section>
  );
}
