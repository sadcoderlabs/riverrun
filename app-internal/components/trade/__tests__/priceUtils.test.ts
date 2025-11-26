import { roundPrice, isValidPrice } from '../priceUtils';

describe('roundPrice', () => {
  describe('Basic functionality', () => {
    it('should round price according to Hyperliquid rules', () => {
      // BTC: szDecimals=5, allowedDecimals=1
      // 87512.5 has 6 sig figs → rounds to 5 sig figs → 87513
      expect(roundPrice(87512.5, 5)).toBe('87513');
      expect(roundPrice(87512, 5)).toBe('87512');

      // ETH: szDecimals=4, allowedDecimals=2
      // 3500.25 has 6 sig figs → rounds to 5 sig figs → 3500.3
      expect(roundPrice(3500.25, 4)).toBe('3500.3');
    });

    it('should handle integer prices', () => {
      expect(roundPrice(87512, 5)).toBe('87512');
      expect(roundPrice(123456, 5)).toBe('123456');
    });

    it('should handle zero and NaN', () => {
      expect(roundPrice(0, 5)).toBe('0');
      expect(roundPrice(NaN, 5)).toBe('0');
    });
  });

  describe('Prices < 0.1 with leading zeros in decimal (XPL-like prices)', () => {
    // This is the key test case for the bug fix
    // For prices like 0.020905, we need 6 decimal places to represent 5 sig figs

    it('should preserve precision for prices with leading zeros in decimal part', () => {
      // XPL-like price: 0.020905 with szDecimals=0 (allowedDecimals=6)
      expect(roundPrice(0.020905, 0)).toBe('0.020905');

      // Similar low-priced assets
      expect(roundPrice(0.004705, 0)).toBe('0.004705');
      expect(roundPrice(0.015161, 0)).toBe('0.015161');
    });

    it('should handle prices with higher szDecimals (less decimal places allowed)', () => {
      // szDecimals=2 means allowedDecimals=4
      // 0.020905 → limited to 4 decimals → 0.0209
      expect(roundPrice(0.020905, 2)).toBe('0.0209');

      // szDecimals=4 means allowedDecimals=2
      // 0.020905 → limited to 2 decimals → 0.02
      expect(roundPrice(0.020905, 4)).toBe('0.02');
    });
  });

  describe('Significant figures constraint', () => {
    it('should round to 5 sig figs when input has more', () => {
      // 0.0209056 has 6 sig figs → should round to 5 sig figs → 0.020906
      expect(roundPrice(0.0209056, 0)).toBe('0.020906');

      // 123.456789 has 9 sig figs → should round to 5 sig figs → 123.46
      expect(roundPrice(123.456789, 4)).toBe('123.46');
    });

    it('should preserve prices with 5 or fewer sig figs', () => {
      // 0.020905 has 5 sig figs → should stay as is
      expect(roundPrice(0.020905, 0)).toBe('0.020905');

      // 123.45 has 5 sig figs → should stay as is
      expect(roundPrice(123.45, 4)).toBe('123.45');

      // 1234 has 4 sig figs → should stay as is
      expect(roundPrice(1234, 4)).toBe('1234');
    });
  });

  describe('DOGE/PENGU/PUMP-like prices (szDecimals=0)', () => {
    const szDecimals = 0;

    it('should handle prices around 0.2', () => {
      expect(roundPrice(0.20359, szDecimals)).toBe('0.20359');
      expect(roundPrice(0.2, szDecimals)).toBe('0.2');
    });

    it('should handle prices around 0.01-0.02', () => {
      expect(roundPrice(0.01516, szDecimals)).toBe('0.01516');
      expect(roundPrice(0.020905, szDecimals)).toBe('0.020905');
    });

    it('should handle prices around 0.004', () => {
      expect(roundPrice(0.004705, szDecimals)).toBe('0.004705');
    });
  });

  describe('BTC/ETH-like prices (high szDecimals)', () => {
    it('should handle BTC prices (szDecimals=5)', () => {
      const szDecimals = 5;
      // 87512.5 has 6 sig figs → rounds to 5 sig figs → 87513
      expect(roundPrice(87512.5, szDecimals)).toBe('87513');
      expect(roundPrice(106307, szDecimals)).toBe('106307');
      // 1234.5 has 5 sig figs → stays as is
      expect(roundPrice(1234.5, szDecimals)).toBe('1234.5');
    });

    it('should handle SOL prices (szDecimals=3)', () => {
      const szDecimals = 3;
      // 128.315 has 6 sig figs → rounds to 5 sig figs → 128.32
      expect(roundPrice(128.315, szDecimals)).toBe('128.32');
      // 128.31 has 5 sig figs → stays as is
      expect(roundPrice(128.31, szDecimals)).toBe('128.31');
    });
  });
});

describe('isValidPrice', () => {
  describe('Valid prices', () => {
    it('should accept prices within constraints', () => {
      expect(isValidPrice('0.020905', 0)).toBe(true); // 5 sig figs, 6 decimals
      expect(isValidPrice('1234.5', 5)).toBe(true); // 5 sig figs, 1 decimal
      expect(isValidPrice('123456', 5)).toBe(true); // integer always allowed
    });

    it('should reject prices with too many sig figs (non-integer)', () => {
      // 87512.5 has 6 sig figs and is not an integer → invalid
      expect(isValidPrice('87512.5', 5)).toBe(false);
    });
  });

  describe('Invalid prices', () => {
    it('should reject prices with too many decimal places', () => {
      // szDecimals=4 means max 2 decimal places
      expect(isValidPrice('123.456', 4)).toBe(false);
    });

    it('should reject prices with too many sig figs', () => {
      // 0.0209056 has 6 sig figs
      expect(isValidPrice('0.0209056', 0)).toBe(false);
    });

    it('should reject zero and negative prices', () => {
      expect(isValidPrice('0', 0)).toBe(false);
      expect(isValidPrice('-1', 0)).toBe(false);
    });
  });
});
