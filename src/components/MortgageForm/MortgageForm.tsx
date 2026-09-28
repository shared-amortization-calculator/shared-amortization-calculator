import SliderField from '../SliderField';
import { currencySymbol, formatCurrency } from '../../format';
import type { AppState } from '../../state/appState';

interface MortgageFormProps {
  state: AppState;
  onPatch: (patch: Partial<AppState>) => void;
}

export default function MortgageForm({ state, onPatch }: MortgageFormProps) {
  const money = (value: number) => formatCurrency(value, state.currency, { whole: true });
  const deposit = (state.homePrice * state.downPaymentPercent) / 100;

  return (
    <section aria-labelledby="mortgage-heading">
      <h2 id="mortgage-heading">Mortgage</h2>
      <SliderField
        label="Home price"
        value={state.homePrice}
        min={0}
        sliderMin={50000}
        sliderMax={2000000}
        step={5000}
        prefix={currencySymbol(state.currency)}
        valueText={money}
        onChange={(homePrice) => onPatch({ homePrice })}
      />
      <SliderField
        label="Down payment"
        value={state.downPaymentPercent}
        min={0}
        sliderMax={99.5}
        max={99.5}
        step={0.5}
        suffix="%"
        valueText={(v) => `${v} percent, ${money((state.homePrice * v) / 100)}`}
        hint={`${money(deposit)} deposit, ${money(state.homePrice - deposit)} loan`}
        onChange={(downPaymentPercent) => onPatch({ downPaymentPercent })}
      />
      <SliderField
        label="Interest rate"
        value={state.annualRatePercent}
        min={0}
        sliderMax={15}
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
        step={1}
        integer
        suffix="years"
        valueText={(v) => `${v} years`}
        onChange={(termYears) => onPatch({ termYears })}
      />
    </section>
  );
}
