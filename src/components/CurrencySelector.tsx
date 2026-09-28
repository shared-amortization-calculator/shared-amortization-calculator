import { CURRENCIES, type CurrencyCode } from '../format';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div className="currency-select">
      <label htmlFor="currency">Currency</label>
      <select id="currency" value={value} onChange={(e) => onChange(e.target.value as CurrencyCode)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
