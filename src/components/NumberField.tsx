import { useId, type ReactNode } from 'react';
import NumberInput from './NumberInput';

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  prefix?: string;
  hint?: ReactNode;
}

export default function NumberField({ label, value, onChange, min, prefix, hint }: NumberFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="slider-field">
      <label htmlFor={id}>{label}</label>
      <NumberInput
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        prefix={prefix}
        prefixId={`${id}-prefix`}
        describedBy={hint ? hintId : undefined}
      />
      {hint && (
        <p id={hintId} className="slider-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
