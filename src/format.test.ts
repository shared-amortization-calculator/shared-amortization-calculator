import { describe, expect, it } from 'vitest';
import { capitalize, currencySymbol, depositTerm, formatCurrency, formatMonth, formatPercent } from './format';

describe('formatCurrency', () => {
  it('formats pounds, dollars and euros to the penny', () => {
    expect(formatCurrency(1500.74769, 'GBP')).toBe('£1,500.75');
    expect(formatCurrency(1500.74769, 'USD')).toBe('$1,500.75');
    expect(formatCurrency(1500.74769, 'EUR')).toBe('€1,500.75');
  });

  it('formats whole amounts without pennies', () => {
    expect(formatCurrency(300000, 'GBP', { whole: true })).toBe('£300,000');
  });

  it('never shows negative zero from floating-point residue', () => {
    expect(formatCurrency(-0.000001, 'GBP')).toBe('£0.00');
  });

  it('formats compact axis labels with the symbol', () => {
    expect(formatCurrency(300000, 'GBP', { compact: true })).toMatch(/^£300\s?[kK]$/);
  });
});

describe('currencySymbol', () => {
  it('returns the symbol for each currency', () => {
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
  });
});

describe('depositTerm', () => {
  it('says deposit for pounds and euros and down payment for dollars', () => {
    expect(depositTerm('GBP')).toBe('deposit');
    expect(depositTerm('EUR')).toBe('deposit');
    expect(depositTerm('USD')).toBe('down payment');
  });
});

describe('capitalize', () => {
  it('upper-cases only the first letter', () => {
    expect(capitalize('down payment')).toBe('Down payment');
  });
});

describe('formatMonth', () => {
  it('labels month 0 as the start', () => {
    expect(formatMonth(0)).toBe('Start');
  });

  it('labels months by year and month within the year', () => {
    expect(formatMonth(1)).toBe('Year 1, month 1');
    expect(formatMonth(12)).toBe('Year 1, month 12');
    expect(formatMonth(13)).toBe('Year 2, month 1');
    expect(formatMonth(242)).toBe('Year 21, month 2');
    expect(formatMonth(300)).toBe('Year 25, month 12');
  });
});

describe('formatPercent', () => {
  it('shows up to one decimal place', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1 / 3)).toBe('33.3%');
    expect(formatPercent(0.005)).toBe('0.5%');
    expect(formatPercent(1e-16)).toBe('0%');
  });
});
