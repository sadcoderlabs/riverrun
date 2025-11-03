import { formatPercent } from '../formatPercent';

describe('formatPercent', () => {
  describe('basic percentage formatting', () => {
    it('formats with 0 decimals', () => {
      expect(formatPercent(15, 0)).toBe('15%');
      expect(formatPercent(15.4, 0)).toBe('15%');
      expect(formatPercent(15.6, 0)).toBe('16%');
    });

    it('formats with 1 decimal (position ROE)', () => {
      expect(formatPercent(12.5, 1)).toBe('12.5%');
      expect(formatPercent(12, 1)).toBe('12.0%');
      expect(formatPercent(12.54, 1)).toBe('12.5%');
    });

    it('formats with 2 decimals (24h change)', () => {
      expect(formatPercent(3.45, 2)).toBe('3.45%');
      expect(formatPercent(3.4, 2)).toBe('3.40%');
      expect(formatPercent(3.456, 2)).toBe('3.46%');
    });

    it('formats with 3 decimals', () => {
      expect(formatPercent(1.234, 3)).toBe('1.234%');
      expect(formatPercent(1.2, 3)).toBe('1.200%');
      expect(formatPercent(1.2346, 3)).toBe('1.235%');
    });

    it('formats with 4 decimals (8h funding)', () => {
      expect(formatPercent(0.0123, 4)).toBe('0.0123%');
      expect(formatPercent(0.01, 4)).toBe('0.0100%');
      expect(formatPercent(0.01234, 4)).toBe('0.0123%');
    });
  });

  describe('decimal form conversion', () => {
    it('converts from decimal form when isDecimalForm=true', () => {
      expect(formatPercent(0.05, 1, true)).toBe('5.0%');
      expect(formatPercent(0.125, 1, true)).toBe('12.5%');
      expect(formatPercent(0.0345, 2, true)).toBe('3.45%');
      expect(formatPercent(0.000123, 4, true)).toBe('0.0123%');
    });

    it('does not convert when isDecimalForm=false (default)', () => {
      expect(formatPercent(5, 1)).toBe('5.0%');
      expect(formatPercent(12.5, 1)).toBe('12.5%');
      expect(formatPercent(3.45, 2)).toBe('3.45%');
    });
  });

  describe('negative values', () => {
    it('handles negative percentages', () => {
      expect(formatPercent(-5.5, 1)).toBe('-5.5%');
      expect(formatPercent(-12.34, 2)).toBe('-12.34%');
      expect(formatPercent(-0.0123, 4)).toBe('-0.0123%');
    });

    it('handles negative values in decimal form', () => {
      expect(formatPercent(-0.055, 1, true)).toBe('-5.5%');
      expect(formatPercent(-0.1234, 2, true)).toBe('-12.34%');
    });
  });

  describe('thousand separators', () => {
    it('adds thousand separators for large percentages', () => {
      expect(formatPercent(1234.56, 2)).toBe('1,234.56%');
      expect(formatPercent(1000, 0)).toBe('1,000%');
      expect(formatPercent(1234567.89, 2)).toBe('1,234,567.89%');
    });

    it('adds thousand separators for negative large percentages', () => {
      expect(formatPercent(-1234.56, 2)).toBe('-1,234.56%');
      expect(formatPercent(-1000, 1)).toBe('-1,000.0%');
    });
  });

  describe('edge cases', () => {
    it('handles zero', () => {
      expect(formatPercent(0, 0)).toBe('0%');
      expect(formatPercent(0, 1)).toBe('0.0%');
      expect(formatPercent(0, 2)).toBe('0.00%');
      expect(formatPercent(0, 4)).toBe('0.0000%');
    });

    it('handles string input', () => {
      expect(formatPercent('12.5', 1)).toBe('12.5%');
      expect(formatPercent('3.45', 2)).toBe('3.45%');
      expect(formatPercent('0.0123', 4, true)).toBe('1.2300%');
    });

    it('handles invalid values', () => {
      expect(formatPercent(NaN, 2)).toBe('0.00%');
      expect(formatPercent(Infinity, 2)).toBe('0.00%');
      expect(formatPercent(-Infinity, 2)).toBe('0.00%');
    });

    it('handles very small percentages', () => {
      expect(formatPercent(0.0001, 4)).toBe('0.0001%');
      expect(formatPercent(0.00001, 4)).toBe('0.0000%');
      expect(formatPercent(0.000001, 4, true)).toBe('0.0001%');
    });
  });

  describe('trailing zeros', () => {
    it('keeps trailing zeros for consistency', () => {
      expect(formatPercent(10.5, 2)).toBe('10.50%');
      expect(formatPercent(100, 2)).toBe('100.00%');
      expect(formatPercent(5, 4)).toBe('5.0000%');
    });
  });

  describe('rounding', () => {
    it('rounds correctly', () => {
      expect(formatPercent(12.345, 2)).toBe('12.35%');
      expect(formatPercent(12.344, 2)).toBe('12.34%');
      expect(formatPercent(12.55, 1)).toBe('12.6%');
      expect(formatPercent(12.54, 1)).toBe('12.5%');
    });
  });
});
