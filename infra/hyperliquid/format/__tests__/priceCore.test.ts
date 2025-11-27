import Big from 'big.js';
import {
  MAX_DECIMALS_PERP,
  MAX_SIG_FIGS,
  countSigFigs,
  countIntegerDigits,
  roundToSigFigs,
  getAllowedDecimals,
  roundPrice,
  isValidPrice,
} from '../priceCore';

describe('priceCore', () => {
  describe('constants', () => {
    it('should have correct constant values', () => {
      expect(MAX_DECIMALS_PERP).toBe(6);
      expect(MAX_SIG_FIGS).toBe(5);
    });
  });

  describe('countSigFigs', () => {
    it('should return 0 for zero', () => {
      expect(countSigFigs(new Big(0))).toBe(0);
    });

    it('should count sig figs for integers', () => {
      expect(countSigFigs(new Big(1))).toBe(1);
      expect(countSigFigs(new Big(12))).toBe(2);
      expect(countSigFigs(new Big(123))).toBe(3);
      expect(countSigFigs(new Big(4219))).toBe(4);
      expect(countSigFigs(new Big(114971))).toBe(6);
    });

    it('should count sig figs for decimals >= 1', () => {
      expect(countSigFigs(new Big('4219.5'))).toBe(5);
      expect(countSigFigs(new Big('123.45'))).toBe(5);
      expect(countSigFigs(new Big('10.5'))).toBe(3);
    });

    it('should count sig figs for decimals < 1 (leading zeros do not count)', () => {
      expect(countSigFigs(new Big('0.2'))).toBe(1);
      expect(countSigFigs(new Big('0.03'))).toBe(1);
      expect(countSigFigs(new Big('0.01516'))).toBe(4);
      expect(countSigFigs(new Big('0.004705'))).toBe(4);
      expect(countSigFigs(new Big('0.020905'))).toBe(5);
      expect(countSigFigs(new Big('0.028542'))).toBe(5);
    });

    it('should handle trailing zeros correctly', () => {
      // Big.js automatically removes trailing zeros
      expect(countSigFigs(new Big('4219.5'))).toBe(5);
    });
  });

  describe('countIntegerDigits', () => {
    it('should return 0 for numbers < 1', () => {
      expect(countIntegerDigits(new Big(0))).toBe(0);
      expect(countIntegerDigits(new Big('0.5'))).toBe(0);
      expect(countIntegerDigits(new Big('0.020905'))).toBe(0);
    });

    it('should count integer digits correctly', () => {
      expect(countIntegerDigits(new Big(1))).toBe(1);
      expect(countIntegerDigits(new Big(12))).toBe(2);
      expect(countIntegerDigits(new Big(123))).toBe(3);
      expect(countIntegerDigits(new Big(87512))).toBe(5);
      expect(countIntegerDigits(new Big(114971))).toBe(6);
    });

    it('should ignore decimal part', () => {
      expect(countIntegerDigits(new Big('123.456'))).toBe(3);
      expect(countIntegerDigits(new Big('87512.5'))).toBe(5);
    });
  });

  describe('roundToSigFigs', () => {
    it('should return 0 for zero', () => {
      expect(roundToSigFigs(new Big(0), 5).toNumber()).toBe(0);
    });

    it('should round to specified sig figs', () => {
      expect(roundToSigFigs(new Big(123456), 5).toNumber()).toBe(123460);
      expect(roundToSigFigs(new Big('87512.5'), 5).toNumber()).toBe(87513);
      expect(roundToSigFigs(new Big('0.0209056'), 5).toNumber()).toBeCloseTo(0.020906, 6);
    });

    it('should not change numbers with fewer sig figs', () => {
      expect(roundToSigFigs(new Big(1234), 5).toNumber()).toBe(1234);
      expect(roundToSigFigs(new Big('0.0209'), 5).toNumber()).toBe(0.0209);
    });
  });

  describe('getAllowedDecimals', () => {
    it('should calculate allowed decimals correctly', () => {
      expect(getAllowedDecimals(0)).toBe(6); // DOGE, XPL, PENGU
      expect(getAllowedDecimals(2)).toBe(4); // SOL
      expect(getAllowedDecimals(4)).toBe(2); // ETH
      expect(getAllowedDecimals(5)).toBe(1); // BTC
    });

    it('should return 0 when szDecimals >= MAX_DECIMALS_PERP', () => {
      expect(getAllowedDecimals(6)).toBe(0);
      expect(getAllowedDecimals(7)).toBe(0);
    });
  });

  describe('roundPrice', () => {
    it('should return Big(0) for invalid prices', () => {
      expect(roundPrice(NaN, 0).toNumber()).toBe(0);
      expect(roundPrice(Infinity, 0).toNumber()).toBe(0);
      expect(roundPrice(-1, 0).toNumber()).toBe(0);
      expect(roundPrice(0, 0).toNumber()).toBe(0);
    });

    it('should handle integer prices (always allowed)', () => {
      const result = roundPrice(123456, 5);
      expect(result.toNumber()).toBe(123456);
    });

    it('should round to allowed decimals first, then to integer if needed', () => {
      // 87512.5 with szDecimals=5 → allowedDecimals=1
      // First round to 1 decimal → 87512.5
      // Integer part has 5 digits → round to integer → 87513
      const result = roundPrice(87512.5, 5);
      expect(result.toNumber()).toBe(87513);
    });

    it('should respect allowedDecimals constraint', () => {
      // 0.020905 with szDecimals=4 → allowedDecimals=2 → 0.02
      const result = roundPrice(0.020905, 4);
      expect(result.toNumber()).toBe(0.02);
    });

    it('should preserve precision for low-priced coins (szDecimals=0)', () => {
      // XPL, DOGE, PENGU: szDecimals=0 → allowedDecimals=6
      const result = roundPrice(0.020905, 0);
      expect(result.toNumber()).toBe(0.020905);
    });

    it('should round to 5 sig figs when needed', () => {
      // 0.210325 has 6 sig figs → rounds to 5 → 0.21033
      const result = roundPrice(0.210325, 0);
      expect(result.toNumber()).toBeCloseTo(0.21033, 5);
    });
  });

  describe('isValidPrice', () => {
    it('should return false for invalid inputs', () => {
      expect(isValidPrice(NaN, 0)).toBe(false);
      expect(isValidPrice(Infinity, 0)).toBe(false);
      expect(isValidPrice(-1, 0)).toBe(false);
      expect(isValidPrice(0, 0)).toBe(false);
    });

    it('should always accept integer prices', () => {
      expect(isValidPrice(123456, 5)).toBe(true);
      expect(isValidPrice(1000000, 0)).toBe(true);
    });

    it('should reject prices with > 5 sig figs', () => {
      expect(isValidPrice(87512.5, 5)).toBe(false); // 6 sig figs
      expect(isValidPrice(0.0209056, 0)).toBe(false); // 6 sig figs
    });

    it('should reject prices with too many decimal places', () => {
      // szDecimals=4 → max 2 decimals
      expect(isValidPrice(123.456, 4)).toBe(false);
      expect(isValidPrice(123.45, 4)).toBe(true);
    });

    it('should accept valid prices', () => {
      expect(isValidPrice(0.020905, 0)).toBe(true); // 5 sig figs, 6 decimals
      expect(isValidPrice(1234.5, 5)).toBe(true); // 5 sig figs, 1 decimal
    });
  });

  describe('real-world examples', () => {
    describe('BTC (szDecimals=5, allowedDecimals=1)', () => {
      const szDecimals = 5;

      it('should handle typical BTC prices', () => {
        expect(roundPrice(87512, szDecimals).toNumber()).toBe(87512);

        // 87512.5 → round to 1 decimal → integer part >= 5 → round to integer → 87513
        expect(roundPrice(87512.5, szDecimals).toNumber()).toBe(87513);

        // 1234.5 has 5 sig figs → valid
        expect(roundPrice(1234.5, szDecimals).toNumber()).toBe(1234.5);
      });
    });

    describe('XPL/DOGE/PENGU (szDecimals=0, allowedDecimals=6)', () => {
      const szDecimals = 0;

      it('should preserve full precision for low-priced coins with <= 5 sig figs', () => {
        expect(roundPrice(0.020905, szDecimals).toNumber()).toBe(0.020905);
        expect(roundPrice(0.004705, szDecimals).toNumber()).toBe(0.004705);
        expect(roundPrice(0.20359, szDecimals).toNumber()).toBe(0.20359);
      });

      it('should round prices with > 5 sig figs', () => {
        // 0.210325 has 6 sig figs → rounds to 5 → 0.21033
        expect(roundPrice(0.210325, szDecimals).toNumber()).toBeCloseTo(0.21033, 5);
      });
    });

    describe('SOL (szDecimals=2, allowedDecimals=4)', () => {
      const szDecimals = 2;

      it('should handle SOL prices', () => {
        expect(roundPrice(128.31, szDecimals).toNumber()).toBe(128.31);

        // 128.3156 → round to 4 decimals → 128.3156 → 7 sig figs → round to 5 → 128.32
        expect(roundPrice(128.3156, szDecimals).toNumber()).toBe(128.32);
      });
    });
  });
});
