import { describe, expect, it } from 'vitest';
import { clamp, formatNumber, round2 } from './numbers';

describe('number helpers', () => {
  it('round2 rounds to two decimals (0.01 mm)', () => {
    expect(round2(1.23456)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(-0.004)).toBe(-0);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('clamp limits a value to a range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('formatNumber shows at most two decimals without trailing zeros', () => {
    expect(formatNumber(9)).toBe('9');
    expect(formatNumber(23.906)).toBe('23.91');
    expect(formatNumber(0.5)).toBe('0.5');
  });
});
