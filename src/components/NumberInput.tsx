import { useState } from 'react';

export interface NumberInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
  integer?: boolean;
  prefix?: string;
  prefixId?: string;
  suffix?: string;
  suffixId?: string;
  ariaLabel?: string;
  describedBy?: string;
}

function display(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function clampValue(n: number, min: number, max: number, integer: boolean): number {
  return Math.min(max, Math.max(min, integer ? Math.round(n) : n));
}

export default function NumberInput({
  id,
  value,
  onChange,
  min,
  max = Number.POSITIVE_INFINITY,
  integer = false,
  prefix,
  prefixId,
  suffix,
  suffixId,
  ariaLabel,
  describedBy,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const ariaDescribedBy =
    [prefix && prefixId, suffix && suffixId, describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <span className="slider-field__number">
      {prefix && <span id={prefixId}>{prefix}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        value={draft ?? display(value)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(clampValue(parsed, min, max, integer));
        }}
        onBlur={() => setDraft(null)}
      />
      {suffix && <span id={suffixId}>{suffix}</span>}
    </span>
  );
}
