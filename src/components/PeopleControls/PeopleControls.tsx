import { useEffect, useRef, useState } from 'react';
import NumberField from '../NumberField';
import SliderField from '../SliderField';
import SplitControl from '../SplitControl';
import type { Person } from '../../calc/types';
import { capitalize, currencySymbol, depositTerm, formatMonth } from '../../format';
import {
  addPerson,
  displayName,
  MAX_PEOPLE,
  removePerson,
  toMortgageInputs,
  updatePerson,
  type AppState,
} from '../../state/appState';

interface PeopleControlsProps {
  state: AppState;
  monthlyPayment: number;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function PeopleControls({ state, monthlyPayment, update }: PeopleControlsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusNameOf, setFocusNameOf] = useState<{ id: string } | null>(null);
  const { people, currency } = state;
  const termMonths = state.termYears * 12;
  const setPeople = (next: Person[]) => update((s) => ({ ...s, people: next }));

  useEffect(() => {
    if (focusNameOf) document.getElementById(`${focusNameOf.id}-name`)?.focus();
  }, [focusNameOf]);

  const handleAdd = () => {
    const next = addPerson(state);
    update(() => next);
    setFocusNameOf({ id: next.people[next.people.length - 1].id });
  };

  return (
    <section aria-labelledby="people-heading">
      <h2 id="people-heading" ref={headingRef} tabIndex={-1}>
        People
      </h2>
      <div className="people">
        {people.map((person, index) => {
          const name = displayName(person, index);
          const headingId = `${person.id}-heading`;
          const nameId = `${person.id}-name`;
          return (
            <div key={person.id} className="person-card" role="group" aria-labelledby={headingId}>
              <h3 id={headingId}>{name}</h3>
              <div className="text-field">
                <label htmlFor={nameId}>Name</label>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="off"
                  value={person.name}
                  onChange={(e) => update((s) => updatePerson(s, person.id, { name: e.target.value }))}
                />
              </div>
              <NumberField
                label="Overpayment per month"
                value={person.overpaymentMonthly}
                min={0}
                prefix={currencySymbol(currency)}
                onChange={(v) => update((s) => updatePerson(s, person.id, { overpaymentMonthly: v }))}
              />
              <SliderField
                label="Overpayments start in month"
                value={person.overpaymentStartMonth}
                min={1}
                sliderMax={termMonths}
                max={termMonths}
                step={1}
                integer
                valueText={formatMonth}
                hint={formatMonth(person.overpaymentStartMonth)}
                onChange={(v) => update((s) => updatePerson(s, person.id, { overpaymentStartMonth: v }))}
              />
              {people.length > 1 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    update((s) => removePerson(s, person.id));
                    headingRef.current?.focus();
                  }}
                >
                  Remove {name}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {people.length < MAX_PEOPLE && (
        <p>
          <button type="button" onClick={handleAdd}>
            Add person
          </button>
        </p>
      )}
      <SplitControl legend={`${capitalize(depositTerm(currency))} split`} people={people} shareKey="downPaymentShare" total={toMortgageInputs(state).downPayment} currency={currency} onChange={setPeople} />
      <SplitControl legend="Monthly payment split" people={people} shareKey="paymentShare" total={monthlyPayment} currency={currency} onChange={setPeople} />
    </section>
  );
}
