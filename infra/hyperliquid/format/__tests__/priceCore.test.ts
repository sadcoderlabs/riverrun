import {
  MAX_DECIMALS_PERP,
  MAX_SIGNIFICANT_FIGURES,
  countSignificantFigures,
  countIntegerDigits,
  roundToSignificantFigures,
  getAllowedDecimals,
  applyHyperliquidPriceRules,
  isValidHyperliquidPrice,
} from '../priceCore';

describe('priceCore', () => {
  describe('constants', () => {
    it('should have correct constant values', () => {
      expect(MAX_DECIMALS_PERP).toBe(6);
      expect(MAX_SIGNIFICANT_FIGURES).toBe(5);
    });
  });

  describe('countSignificantFigures', () => {
    it('should return 0 for zero', () => {
      expect(countSignificantFigures(0)).toBe(0);
    });

    it('should count sig figs for integers', () => {
      expect(countSignificantFigures(1)).toBe(1);
      expect(countSignificantFigures(12)).toBe(2);
      expect(countSignificantFigures(123)).toBe(3);
      expect(countSignificantFigures(4219)).toBe(4);
      expect(countSignificantFigures(114971)).toBe(6);
    });

    it('should count sig figs for decimals >= 1', () => {
      expect(countSignificantFigures(4219.5)).toBe(5);
      expect(countSignificantFigures(123.45)).toBe(5);
      expect(countSignificantFigures(10.5)).toBe(3);
    });

    it('should count sig figs for decimals < 1 (leading zeros do not count)', () => {
      expect(countSignificantFigures(0.2)).toBe(1);
      expect(countSignificantFigures(0.03)).toBe(1);
      expect(countSignificantFigures(0.01516)).toBe(4);
      expect(countSignificantFigures(0.004705)).toBe(4);
      expect(countSignificantFigures(0.020905)).toBe(5);
      expect(countSignificantFigures(0.028542)).toBe(5);
    });

    it('should handle trailing zeros correctly', () => {
      // When parsed as number, trailing zeros in decimals are removed
      expect(countSignificantFigures(4219.5)).toBe(5);
      expect(countSignificantFigures(4219.5)).toBe(countSignificantFigures(4219.5));
    });
  });

  describe('countIntegerDigits', () => {
    it('should return 1 for zero', () => {
      expect(countIntegerDigits(0)).toBe(1);
    });

    it('should count integer digits correctly', () => {
      expect(countIntegerDigits(1)).toBe(1);
      expect(countIntegerDigits(12)).toBe(2);
      expect(countIntegerDigits(123)).toBe(3);
      expect(countIntegerDigits(87512)).toBe(5);
      expect(countIntegerDigits(114971)).toBe(6);
    });

    it('should return 1 for decimals < 1', () => {
      expect(countIntegerDigits(0.5)).toBe(1);
      expect(countIntegerDigits(0.020905)).toBe(1);
    });

    it('should ignore decimal part', () => {
      expect(countIntegerDigits(123.456)).toBe(3);
      expect(countIntegerDigits(87512.5)).toBe(5);
    });
  });

  describe('roundToSignificantFigures', () => {
    it('should return 0 for zero', () => {
      expect(roundToSignificantFigures(0, 5)).toBe(0);
    });

    it('should round to specified sig figs', () => {
      expect(roundToSignificantFigures(123456, 5)).toBe(123460);
      expect(roundToSignificantFigures(87512.5, 5)).toBe(87513);
      // Use toBeCloseTo for floating point precision
      expect(roundToSignificantFigures(0.0209056, 5)).toBeCloseTo(0.020906, 6);
    });

    it('should not change numbers with fewer sig figs', () => {
      expect(roundToSignificantFigures(1234, 5)).toBe(1234);
      expect(roundToSignificantFigures(0.0209, 5)).toBe(0.0209);
    });
  });

  describe('getAllowedDecimals', () => {
    it('should calculate allowed decimals correctly', () => {
      expect(getAllowedDecimals(0)).toBe(6); // DOGE, XPL, PENGU
      expect(getAllowedDecimals(2)).toBe(4); // SOL
      expect(getAllowedDecimals(4)).toBe(2); // ETH
      expect(getAllowedDecimals(5)).toBe(1); // BTC
    });

    it('should return 0 when szDecimals >= MAX_DECIMALS', () => {
      expect(getAllowedDecimals(6)).toBe(0);
      expect(getAllowedDecimals(7)).toBe(0);
    });
  });

  describe('applyHyperliquidPriceRules', () => {
    it('should return undefined for invalid prices', () => {
      expect(applyHyperliquidPriceRules(NaN, 0)).toBeUndefined();
      expect(applyHyperliquidPriceRules(Infinity, 0)).toBeUndefined();
      expect(applyHyperliquidPriceRules(-1, 0)).toBeUndefined();
      expect(applyHyperliquidPriceRules(0, 0)).toBeUndefined();
    });

    it('should handle integer prices (always allowed)', () => {
      const result = applyHyperliquidPriceRules(123456, 5);
      expect(result).toBeDefined();
      expect(result?.value).toBe(123456);
      expect(result?.isInteger).toBe(true);
    });

    it('should round to 5 sig figs for non-integers', () => {
      // 87512.5 has 6 sig figs → rounds to 5 → 87513
      const result = applyHyperliquidPriceRules(87512.5, 5);
      expect(result?.value).toBe(87513);
    });

    it('should respect allowedDecimals constraint', () => {
      // 0.020905 with szDecimals=4 → allowedDecimals=2 → 0.02
      const result = applyHyperliquidPriceRules(0.020905, 4);
      expect(result?.value).toBe(0.02);
      expect(result?.allowedDecimals).toBe(2);
    });

    it('should preserve precision for low-priced coins (szDecimals=0)', () => {
      // XPL, DOGE, PENGU: szDecimals=0 → allowedDecimals=6
      const result = applyHyperliquidPriceRules(0.020905, 0);
      expect(result?.value).toBe(0.020905);
      expect(result?.allowedDecimals).toBe(6);
    });
  });

  describe('isValidHyperliquidPrice', () => {
    it('should return false for invalid inputs', () => {
      expect(isValidHyperliquidPrice(NaN, 0)).toBe(false);
      expect(isValidHyperliquidPrice(Infinity, 0)).toBe(false);
      expect(isValidHyperliquidPrice(-1, 0)).toBe(false);
      expect(isValidHyperliquidPrice(0, 0)).toBe(false);
    });

    it('should always accept integer prices', () => {
      expect(isValidHyperliquidPrice(123456, 5)).toBe(true);
      expect(isValidHyperliquidPrice(1000000, 0)).toBe(true);
    });

    it('should reject prices with > 5 sig figs', () => {
      expect(isValidHyperliquidPrice(87512.5, 5)).toBe(false); // 6 sig figs
      expect(isValidHyperliquidPrice(0.0209056, 0)).toBe(false); // 6 sig figs
    });

    it('should reject prices with too many decimal places', () => {
      // szDecimals=4 → max 2 decimals
      expect(isValidHyperliquidPrice(123.456, 4)).toBe(false);
      expect(isValidHyperliquidPrice(123.45, 4)).toBe(true);
    });

    it('should accept valid prices', () => {
      expect(isValidHyperliquidPrice(0.020905, 0)).toBe(true); // 5 sig figs, 6 decimals
      expect(isValidHyperliquidPrice(1234.5, 5)).toBe(true); // 5 sig figs, 1 decimal
    });
  });

  describe('real-world examples', () => {
    describe('BTC (szDecimals=5, allowedDecimals=1)', () => {
      const szDecimals = 5;

      it('should handle typical BTC prices', () => {
        const result1 = applyHyperliquidPriceRules(87512, szDecimals);
        expect(result1?.value).toBe(87512);

        // 87512.5 has 6 sig figs → rounds
        const result2 = applyHyperliquidPriceRules(87512.5, szDecimals);
        expect(result2?.value).toBe(87513);

        // 1234.5 has 5 sig figs → valid
        const result3 = applyHyperliquidPriceRules(1234.5, szDecimals);
        expect(result3?.value).toBe(1234.5);
      });
    });

    describe('XPL/DOGE/PENGU (szDecimals=0, allowedDecimals=6)', () => {
      const szDecimals = 0;

      it('should preserve full precision for low-priced coins with <= 5 sig figs', () => {
        // 0.020905 has 5 sig figs → preserved
        const result1 = applyHyperliquidPriceRules(0.020905, szDecimals);
        expect(result1?.value).toBe(0.020905);

        // 0.004705 has 4 sig figs → preserved
        const result2 = applyHyperliquidPriceRules(0.004705, szDecimals);
        expect(result2?.value).toBe(0.004705);

        // 0.20359 has 5 sig figs → preserved
        const result3 = applyHyperliquidPriceRules(0.20359, szDecimals);
        expect(result3?.value).toBe(0.20359);
      });

      it('should round prices with > 5 sig figs', () => {
        // 0.210325 has 6 sig figs → rounds to 5 → 0.21033
        const result = applyHyperliquidPriceRules(0.210325, szDecimals);
        expect(result?.value).toBeCloseTo(0.21033, 5);
      });
    });

    describe('SOL (szDecimals=2, allowedDecimals=4)', () => {
      const szDecimals = 2;

      it('should handle SOL prices', () => {
        const result1 = applyHyperliquidPriceRules(128.31, szDecimals);
        expect(result1?.value).toBe(128.31);

        // 128.3156 has 7 sig figs → rounds to 5 → 128.32
        const result2 = applyHyperliquidPriceRules(128.3156, szDecimals);
        expect(result2?.value).toBe(128.32);
      });
    });
  });
});
