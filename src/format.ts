export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: 'GBP', label: '£ GBP', locale: 'en-GB' },
  { code: 'USD', label: '$ USD', locale: 'en-US' },
  { code: 'EUR', label: '€ EUR', locale: 'en-IE' },
];

function localeFor(currency: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === currency)!.locale;
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  options: { whole?: boolean; compact?: boolean } = {},
): string {
  const safe = Math.abs(value) < 0.005 ? 0 : value;
  const minimumFractionDigits = options.whole || options.compact ? 0 : 2;
  return new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency,
    notation: options.compact ? 'compact' : 'standard',
    minimumFractionDigits,
    maximumFractionDigits: options.compact ? 1 : minimumFractionDigits,
  }).format(safe);
}

export function currencySymbol(currency: CurrencyCode): string {
  return new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency')!.value;
}

export function formatMonth(month: number): string {
  if (month === 0) return 'Start';
  const year = Math.floor((month - 1) / 12) + 1;
  const monthInYear = ((month - 1) % 12) + 1;
  return `Year ${year}, month ${monthInYear}`;
}

export function formatPercent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(1))}%`;
}
