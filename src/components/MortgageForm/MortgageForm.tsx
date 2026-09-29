import NumberField from '../NumberField';
import SliderField from '../SliderField';
import { capitalize, currencySymbol, depositTerm, formatCurrency } from '../../format';
import type { AppState } from '../../state/appState';

interface MortgageFormProps {
  state: AppState;
  onPatch: (patch: Partial<AppState>) => void;
}

export default function MortgageForm({ state, onPatch }: MortgageFormProps) {
  const money = (value: number) => formatCurrency(value, state.currency, { whole: true });
  const deposit = (state.homePrice * state.downPaymentPercent) / 100;
  const loan = state.homePrice - deposit + state.feesAddedToLoan;
  const term = depositTerm(state.currency);

  return (
    <section aria-labelledby="mortgage-heading">
      <h2 id="mortgage-heading">Mortgage</h2>
      <div className="field-row">
        <NumberField
          label="Home price"
          value={state.homePrice}
          min={0}
          prefix={currencySymbol(state.currency)}
          onChange={(homePrice) => onPatch({ homePrice })}
        />
        <NumberField
          label="Fees added to loan"
          value={state.feesAddedToLoan}
          min={0}
          prefix={currencySymbol(state.currency)}
          hint="One-off product fees your lender adds to the loan"
          onChange={(feesAddedToLoan) => onPatch({ feesAddedToLoan })}
        />
      </div>
      <SliderField
        label={capitalize(term)}
        value={state.downPaymentPercent}
        min={0}
        sliderMax={99.5}
        max={99.5}
        step={0.5}
        suffix="%"
        valueText={(v) => `${v} percent, ${money((state.homePrice * v) / 100)}`}
        hint={`${money(deposit)} ${term}, ${money(loan)} loan`}
        onChange={(downPaymentPercent) => onPatch({ downPaymentPercent })}
      />
      <SliderField
        label="Interest rate"
        value={state.annualRatePercent}
        min={0}
        sliderMax={15}
        max={15}
        step={0.05}
        suffix="% a year"
        valueText={(v) => `${v} percent a year`}
        onChange={(annualRatePercent) => onPatch({ annualRatePercent })}
      />
      <SliderField
        label="Term"
        value={state.termYears}
        min={1}
        sliderMax={40}
        max={40}
        step={1}
        integer
        suffix="years"
        valueText={(v) => `${v} years`}
        onChange={(termYears) => onPatch({ termYears })}
      />
    </section>
  );
}
