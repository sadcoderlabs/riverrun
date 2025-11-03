import { formatPrice } from '../formatPrice';

describe('formatPrice', () => {
  describe('Basic functionality', () => {
    it('should format price with 5 sig fig padding rule', () => {
      // ETH: szDecimals=4, maxDecimals=6, maxDecimalPlaces=2
      expect(formatPrice('4219', 4, false)).toBe('4219.0');
      expect(formatPrice('123', 4, false)).toBe('123.00');
      expect(formatPrice('4219.5', 4, false)).toBe('4219.5');
    });

    it('should handle string input', () => {
      expect(formatPrice('100.5', 2, false)).toBe('100.50');
      // 1000.123 has 7 sig figs, gets truncated to maxDecimalPlaces=3
      expect(formatPrice('1000.123', 3, false)).toBe('1000.123');
    });

    it('should handle number input', () => {
      expect(formatPrice(100.5, 2, false)).toBe('100.50');
      // 1000.123 has 7 sig figs, gets truncated to maxDecimalPlaces=3
      expect(formatPrice(1000.123, 3, false)).toBe('1000.123');
    });
  });

  describe('5 sig fig padding rule', () => {
    it('should pad to 5 sig figs when < 5', () => {
      // 4 sig figs → pad 1 decimal
      expect(formatPrice('4219', 4, false)).toBe('4219.0');

      // 3 sig figs → pad 2 decimals
      expect(formatPrice('123', 4, false)).toBe('123.00');

      // 2 sig figs → pad 3 decimals (but capped by maxDecimalPlaces)
      expect(formatPrice('12', 4, false)).toBe('12.00');
    });

    it('should not pad when >= 5 sig figs', () => {
      // 5 sig figs → no padding
      expect(formatPrice('4219.5', 4, false)).toBe('4219.5');

      // 6 sig figs → no padding
      expect(formatPrice('114971', 5, false)).toBe('114971');
    });

    it('should remove trailing zeros when >= 5 sig figs', () => {
      expect(formatPrice('4219.50', 4, false)).toBe('4219.5');
      expect(formatPrice('114971.0', 5, false)).toBe('114971');
    });
  });

  describe('maxDecimalPlaces constraint', () => {
    it('should respect maxDecimalPlaces = (maxDecimals - szDecimals)', () => {
      // ETH: szDecimals=4, maxDecimals=6 → maxDecimalPlaces=2
      expect(formatPrice('123', 4, false)).toBe('123.00');
      expect(formatPrice('123.456', 4, false)).toBe('123.46');

      // BTC: szDecimals=5, maxDecimals=6 → maxDecimalPlaces=1
      expect(formatPrice('1149', 5, false)).toBe('1149.0');
      expect(formatPrice('1149.56', 5, false)).toBe('1149.6');

      // DOGE: szDecimals=0, maxDecimals=6 → maxDecimalPlaces=6
      expect(formatPrice('0.2', 0, false)).toBe('0.20000');
      expect(formatPrice('0.203599', 0, false)).toBe('0.203599');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero', () => {
      expect(formatPrice('0', 0, false)).toBe('0');
      expect(formatPrice('0', 4, false)).toBe('0');
      expect(formatPrice(0, 4, false)).toBe('0');
    });

    it('should handle very small numbers', () => {
      // 0.0001 has 4 sig figs → pad 1 decimal to reach 5
      expect(formatPrice('0.0001', 0, false)).toBe('0.00010');
      // 0.00001 has 5 sig figs → no padding
      expect(formatPrice('0.00001', 0, false)).toBe('0.00001');
    });

    it('should handle very large numbers', () => {
      expect(formatPrice('999999', 5, false)).toBe('999999');
      expect(formatPrice('1000000', 5, false)).toBe('1000000');
    });

    it('should handle numbers at rounding boundary', () => {
      // 123.445 → 6 sig figs, rounds to 123.44 due to floating point
      expect(formatPrice('123.445', 4, false)).toBe('123.44');
      // 123.455 → 6 sig figs, rounds to 123.45 due to floating point
      expect(formatPrice('123.455', 4, false)).toBe('123.45');
    });
  });

  describe('Invalid input handling', () => {
    it('should handle negative numbers as zero', () => {
      expect(formatPrice('-1', 2, false)).toBe('0');
      expect(formatPrice(-100, 2, false)).toBe('0');
    });

    it('should handle NaN as zero', () => {
      expect(formatPrice(NaN, 2, false)).toBe('0');
      expect(formatPrice('invalid', 2, false)).toBe('0');
    });

    it('should handle Infinity as zero', () => {
      expect(formatPrice(Infinity, 2, false)).toBe('0');
      expect(formatPrice(-Infinity, 2, false)).toBe('0');
    });
  });

  describe('Real-world crypto examples', () => {
    describe('ETH (szDecimals = 4)', () => {
      const szDecimals = 4;
      const maxDecimals = 6;

      it('should format typical ETH prices', () => {
        expect(formatPrice('4219', szDecimals, false)).toBe('4219.0');
        expect(formatPrice('123', szDecimals, false)).toBe('123.00');
        expect(formatPrice('4219.5', szDecimals, false)).toBe('4219.5');
      });

      it('should remove trailing zeros from ETH prices', () => {
        expect(formatPrice('4219.50', szDecimals, false)).toBe('4219.5');
        expect(formatPrice('4180.60', szDecimals, false)).toBe('4180.6');
      });
    });

    describe('BTC (szDecimals = 5)', () => {
      const szDecimals = 5;
      const maxDecimals = 6;

      it('should format typical BTC prices', () => {
        expect(formatPrice('114971', szDecimals, false)).toBe('114971');
        expect(formatPrice('1149', szDecimals, false)).toBe('1149.0');
      });

      it('should remove trailing zeros from BTC prices', () => {
        expect(formatPrice('114971.0', szDecimals, false)).toBe('114971');
      });
    });

    describe('DOGE (szDecimals = 0)', () => {
      const szDecimals = 0;
      const maxDecimals = 6;

      it('should format typical DOGE prices', () => {
        expect(formatPrice('0.2', szDecimals, false)).toBe('0.20000');
        expect(formatPrice('0.20359', szDecimals, false)).toBe('0.20359');
      });

      it('should remove trailing zeros from DOGE prices', () => {
        expect(formatPrice('0.203590', szDecimals, false)).toBe('0.20359');
      });
    });

    describe('PUMP (szDecimals = 0)', () => {
      const szDecimals = 0;
      const maxDecimals = 6;

      it('should format low-priced coins', () => {
        // 0.004705 has 6 sig figs (maxed out)
        expect(formatPrice('0.004705', szDecimals, false)).toBe('0.004705');
        // 0.00471 has 5 sig figs → no padding
        expect(formatPrice('0.00471', szDecimals, false)).toBe('0.00471');
      });
    });
  });

  describe('Thousands separator', () => {
    it('should add thousands separators when enabled', () => {
      // 1000 has 4 sig figs → pad 1 decimal to reach 5
      expect(formatPrice('1000', 2, true)).toBe('1,000.0');
      // 10000 has 5 sig figs → no padding
      expect(formatPrice('10000', 3, true)).toBe('10,000');
      expect(formatPrice('100000', 5, true)).toBe('100,000');
      expect(formatPrice('1000000', 5, true)).toBe('1,000,000');
    });

    it('should not add thousands separators when disabled', () => {
      // 1000 has 4 sig figs → pad 1 decimal to reach 5
      expect(formatPrice('1000', 2, false)).toBe('1000.0');
      // 10000 has 5 sig figs → no padding
      expect(formatPrice('10000', 3, false)).toBe('10000');
      expect(formatPrice('100000', 5, false)).toBe('100000');
      expect(formatPrice('1000000', 5, false)).toBe('1000000');
    });

    it('should add thousands separators with decimals', () => {
      expect(formatPrice('4219.5', 4, true)).toBe('4,219.5');
      expect(formatPrice('114971', 5, true)).toBe('114,971');
      // 1000.123 has 7 sig figs, gets truncated to maxDecimalPlaces=3
      expect(formatPrice('1000.123', 3, true)).toBe('1,000.123');
    });

    it('should not add separators for numbers less than 1000', () => {
      expect(formatPrice('999', 2, true)).toBe('999.00');
      expect(formatPrice('123.5', 4, true)).toBe('123.50');
      expect(formatPrice('0.20359', 0, true)).toBe('0.20359');
    });

    it('should handle thousands separators with 5 sig fig rule', () => {
      // 4 sig figs → pad 1 decimal, add separator
      expect(formatPrice('4219', 4, true)).toBe('4,219.0');

      // 3 sig figs → pad 2 decimals, add separator
      expect(formatPrice('123', 4, true)).toBe('123.00');

      // 5 sig figs → no padding, add separator
      expect(formatPrice('4219.5', 4, true)).toBe('4,219.5');
    });
  });

  describe('Significant figures calculation', () => {
    it('should correctly count sig figs for integers', () => {
      // 4219 has 4 sig figs
      expect(formatPrice('4219', 4, false)).toBe('4219.0');

      // 114971 has 6 sig figs
      expect(formatPrice('114971', 5, false)).toBe('114971');
    });

    it('should correctly count sig figs for decimals < 1', () => {
      // 0.2 has 1 sig fig
      expect(formatPrice('0.2', 0, false)).toBe('0.20000');

      // 0.20359 has 5 sig figs
      expect(formatPrice('0.20359', 0, false)).toBe('0.20359');

      // 0.004705 has 6 sig figs (including leading zeros after decimal)
      expect(formatPrice('0.004705', 0, false)).toBe('0.004705');
    });

    it('should correctly count sig figs for numbers >= 1 with decimals', () => {
      // 4219.5 has 5 sig figs (4 integer + 1 decimal)
      expect(formatPrice('4219.5', 4, false)).toBe('4219.5');

      // 4219.50 has 5 sig figs (trailing zero doesn't count)
      expect(formatPrice('4219.50', 4, false)).toBe('4219.5');
    });
  });

  describe('Perp market MAX_DECIMALS_PERP = 6', () => {
    it('should use MAX_DECIMALS_PERP (6) for all calculations', () => {
      // szDecimals=4, MAX_DECIMALS_PERP=6 → maxDecimalPlaces=2
      expect(formatPrice('123', 4, false)).toBe('123.00');

      // szDecimals=0, MAX_DECIMALS_PERP=6 → maxDecimalPlaces=6
      expect(formatPrice('0.2', 0, false)).toBe('0.20000');
    });

    it('should work correctly with different szDecimals values', () => {
      // szDecimals=4 → maxDecimalPlaces=2
      expect(formatPrice('123', 4, false)).toBe('123.00');

      // szDecimals=0 → maxDecimalPlaces=6
      expect(formatPrice('0.2', 0, false)).toBe('0.20000');

      // szDecimals=5 → maxDecimalPlaces=1
      expect(formatPrice('1149', 5, false)).toBe('1149.0');
    });
  });
});
