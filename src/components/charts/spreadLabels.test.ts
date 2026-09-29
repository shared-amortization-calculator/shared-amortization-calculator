import { describe, expect, it } from 'vitest';
import { spreadLabels } from './spreadLabels';

describe('spreadLabels', () => {
  it('leaves labels that are already far enough apart where they are', () => {
    expect(spreadLabels([100, 20, 60], 16, 0, 200)).toEqual([100, 20, 60]);
  });

  it('spreads equal positions evenly about their shared position', () => {
    expect(spreadLabels([100, 100, 100], 16, 0, 200)).toEqual([84, 100, 116]);
  });

  it('keeps the input order when spreading', () => {
    expect(spreadLabels([105, 95], 16, 0, 200)).toEqual([108, 92]);
  });

  it('merges a group that grows into its neighbour', () => {
    const positions = spreadLabels([50, 70, 70, 70], 16, 0, 200);
    const sorted = [...positions].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(16);
    expect(positions.reduce((a, b) => a + b) / 4).toBeCloseTo(65);
  });

  it('keeps labels inside the top edge', () => {
    expect(spreadLabels([2, 2], 16, 8, 200)).toEqual([8, 24]);
  });

  it('keeps labels inside the bottom edge', () => {
    expect(spreadLabels([199, 199, 199], 16, 0, 200)).toEqual([168, 184, 200]);
  });
});
