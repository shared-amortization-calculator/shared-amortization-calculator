import { useId, useState, type ReactNode } from 'react';

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

function display(value: number): string {
  return String(Math.round(value * 100) / 100);
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
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, integer ? Math.round(n) : n));
  const numberDescribedBy =
    [prefix && prefixId, suffix && suffixId, hint && hintId].filter(Boolean).join(' ') || undefined;

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
          onChange={(e) => {
            setDraft(null);
            onChange(clamp(Number(e.target.value)));
          }}
        />
        <span className="slider-field__number">
          {prefix && <span id={prefixId}>{prefix}</span>}
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={min}
            max={Number.isFinite(max) ? max : undefined}
            value={draft ?? display(value)}
            aria-label={`${label} (exact value)`}
            aria-describedby={numberDescribedBy}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              const parsed = Number(raw);
              if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
            }}
            onBlur={() => setDraft(null)}
          />
          {suffix && <span id={suffixId}>{suffix}</span>}
        </span>
      </div>
      {hint && (
        <p id={hintId} className="slider-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
