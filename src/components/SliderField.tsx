import { useId, type ReactNode } from 'react';
import NumberInput, { clampValue } from './NumberInput';

export interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  sliderMin?: number;
  sliderMax: number;
  max?: number;
  step: number;
  valueText: (value: number) => string;
  prefix?: string;
  suffix?: string;
  integer?: boolean;
  hint?: ReactNode;
}

export default function SliderField({
  label,
  value,
  onChange,
  min,
  sliderMin = min,
  sliderMax,
  max = Number.POSITIVE_INFINITY,
  step,
  valueText,
  prefix,
  suffix,
  integer = false,
  hint,
}: SliderFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const prefixId = `${id}-prefix`;
  const suffixId = `${id}-suffix`;
  const clamp = (n: number) => clampValue(n, min, max, integer);

  return (
    <div className="slider-field">
      <label htmlFor={id}>{label}</label>
      <div className="slider-field__controls">
        <input
          id={id}
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={Math.min(Math.max(value, sliderMin), sliderMax)}
          aria-valuetext={valueText(value)}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <NumberInput
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          integer={integer}
          prefix={prefix}
          prefixId={prefixId}
          suffix={suffix}
          suffixId={suffixId}
          ariaLabel={`${label} (exact value)`}
          describedBy={hint ? hintId : undefined}
        />
      </div>
      {hint && (
        <p id={hintId} className="slider-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
