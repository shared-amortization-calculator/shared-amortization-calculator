import { useEffect, useRef, useState } from 'react';
import NumberField from '../NumberField';
import SliderField from '../SliderField';
import LodgerControls from '../LodgerControls';
import SplitControl from '../SplitControl';
import type { Person, ScheduleResult } from '../../calc/types';
import { capitalize, currencySymbol, depositTerm, formatMonth, lodgerTerm } from '../../format';
import { lodgerActive, lodgerCoversLoan, lodgerPeriod, paymentAfterLodger } from '../../state/lodger';
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
  result: ScheduleResult;
  update: (fn: (s: AppState) => AppState) => void;
}

export default function PeopleControls({ state, result, update }: PeopleControlsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusNameOf, setFocusNameOf] = useState<{ id: string } | null>(null);
  const { people, currency } = state;
  const termMonths = state.termYears * 12;
  const setPeople = (next: Person[]) => update((s) => ({ ...s, people: next }));
  const coversLoan = lodgerCoversLoan(result);
  const paymentPeriods = lodgerActive(state)
    ? {
        during: coversLoan ? `while the ${lodgerTerm(currency)} pays` : lodgerPeriod(result),
        afterTotal: coversLoan ? null : result.monthlyPayment,
      }
    : undefined;

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
      <LodgerControls state={state} update={update} />
      <SplitControl
        legend="Monthly payment split"
        people={people}
        shareKey="paymentShare"
        total={paymentAfterLodger(result.monthlyPayment, state)}
        currency={currency}
        periods={paymentPeriods}
        onChange={setPeople}
      />
    </section>
  );
}
