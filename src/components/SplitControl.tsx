import NumberInput from './NumberInput';
import SliderField from './SliderField';
import type { Person } from '../calc/types';
import { currencySymbol, formatCurrency, formatPercent, type CurrencyCode } from '../format';
import { displayName } from '../state/appState';
import { setShare, shareFromAmount, type ShareKey } from '../state/splits';

interface SplitControlProps {
  legend: string;
  people: Person[];
  shareKey: ShareKey;
  onChange: (people: Person[]) => void;
  total?: number;
  currency?: CurrencyCode;
}

export default function SplitControl({ legend, people, shareKey, onChange, total, currency }: SplitControlProps) {
  const lastIndex = people.length - 1;
  const hasAmount = total !== undefined && currency !== undefined;

  return (
    <fieldset>
      <legend>{legend}</legend>
      {people.length === 1 ? (
        <p>{displayName(people[0], 0)}: 100%</p>
      ) : (
        people.map((person, index) => {
          const name = displayName(person, index);
          if (index === lastIndex) {
            const amount = hasAmount ? `${formatCurrency(person[shareKey] * total, currency)}, ` : '';
            return (
              <p key={person.id}>
                {name} share: {formatPercent(person[shareKey])} ({amount}the remainder)
              </p>
            );
          }
          const setFraction = (fraction: number) => onChange(setShare(people, shareKey, index, fraction));
          return (
            <SliderField
              key={person.id}
              label={`${name} share`}
              value={person[shareKey] * 100}
              min={0}
              sliderMax={100}
              max={100}
              step={1}
              suffix="%"
              valueText={(v) => `${Number(v.toFixed(1))} percent`}
              onChange={(percent) => setFraction(percent / 100)}
              after={
                hasAmount && (
                  <NumberInput
                    value={person[shareKey] * total}
                    min={0}
                    prefix={currencySymbol(currency)}
                    prefixId={`${person.id}-${shareKey}-amount-prefix`}
                    ariaLabel={`${name} share amount`}
                    onChange={(amount) => {
                      const fraction = shareFromAmount(amount, total);
                      if (fraction !== null) setFraction(fraction);
                    }}
                  />
                )
              }
            />
          );
        })
      )}
    </fieldset>
  );
}
