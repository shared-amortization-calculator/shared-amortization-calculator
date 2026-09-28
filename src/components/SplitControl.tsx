import SliderField from './SliderField';
import type { Person } from '../calc/types';
import { formatPercent } from '../format';
import { displayName } from '../state/appState';
import { setShare, type ShareKey } from '../state/splits';

interface SplitControlProps {
  legend: string;
  people: Person[];
  shareKey: ShareKey;
  onChange: (people: Person[]) => void;
}

export default function SplitControl({ legend, people, shareKey, onChange }: SplitControlProps) {
  const lastIndex = people.length - 1;

  return (
    <fieldset>
      <legend>{legend}</legend>
      {people.length === 1 ? (
        <p>{displayName(people[0], 0)}: 100%</p>
      ) : (
        people.map((person, index) => {
          const name = displayName(person, index);
          if (index === lastIndex) {
            return (
              <p key={person.id}>
                {name} share: {formatPercent(person[shareKey])} (the remainder)
              </p>
            );
          }
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
              onChange={(percent) => onChange(setShare(people, shareKey, index, percent / 100))}
            />
          );
        })
      )}
    </fieldset>
  );
}
