import NumberField from './NumberField';
import SliderField from './SliderField';
import { capitalize, currencySymbol, formatMonthCount, lodgerTerm } from '../format';
import type { AppState } from '../state/appState';

interface LodgerControlsProps {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function LodgerControls({ state, update }: LodgerControlsProps) {
  const term = lodgerTerm(state.currency);
  const termMonths = state.termYears * 12;
  const patch = (p: Partial<AppState>) => update((s) => ({ ...s, ...p }));

  return (
    <fieldset>
      <legend>{capitalize(term)}</legend>
      <label className="lodger-toggle">
        <input
          type="checkbox"
          checked={state.lodgerEnabled}
          // Unticking only hides the fields; the rent and months are kept.
          // Ticking limits the months to the term, so a short loan never shows more months than it has.
          onChange={(e) =>
            patch(
              e.target.checked
                ? { lodgerEnabled: true, lodgerMonths: Math.min(state.lodgerMonths, termMonths) }
                : { lodgerEnabled: false },
            )
          }
        />
        We have a {term}
      </label>
      {state.lodgerEnabled && (
        <>
          <NumberField
            label="Rent per month"
            value={state.lodgerRentMonthly}
            min={0}
            prefix={currencySymbol(state.currency)}
            onChange={(lodgerRentMonthly) => patch({ lodgerRentMonthly })}
          />
          <SliderField
            label="Rent paid for"
            value={state.lodgerMonths}
            min={1}
            sliderMax={termMonths}
            max={termMonths}
            step={1}
            integer
            valueText={formatMonthCount}
            hint={formatMonthCount(state.lodgerMonths)}
            onChange={(lodgerMonths) => patch({ lodgerMonths })}
          />
        </>
      )}
    </fieldset>
  );
}
