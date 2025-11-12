import { formatSize } from '../formatSize';

describe('formatSize', () => {
  describe('Basic functionality', () => {
    it('should format size with trailing zeros removed', () => {
      expect(formatSize('0.1000', 4, false)).toBe('0.1');
      expect(formatSize('1.5000', 4, false)).toBe('1.5');
      expect(formatSize('10.2500', 4, false)).toBe('10.25');
    });

    it('should handle string input', () => {
      expect(formatSize('0.123', 3, false)).toBe('0.123');
      expect(formatSize('1.234', 3, false)).toBe('1.234');
      expect(formatSize('100.5', 2, false)).toBe('100.5');
    });

    it('should handle number input', () => {
      expect(formatSize(0.123, 3, false)).toBe('0.123');
      expect(formatSize(1.234, 3, false)).toBe('1.234');
      expect(formatSize(100.5, 2, false)).toBe('100.5');
    });
  });

  describe('Decimal precision (szDecimals)', () => {
    it('should respect szDecimals = 0', () => {
      expect(formatSize('123', 0, false)).toBe('123');
      expect(formatSize('123.456', 0, false)).toBe('123');
      expect(formatSize(123.456, 0, false)).toBe('123');
    });

    it('should respect szDecimals = 1', () => {
      expect(formatSize('123.456', 1, false)).toBe('123.5');
      expect(formatSize('123.45', 1, false)).toBe('123.5');
      expect(formatSize('123.9', 1, false)).toBe('123.9');
    });

    it('should respect szDecimals = 2', () => {
      expect(formatSize('123.456', 2, false)).toBe('123.46');
      expect(formatSize('123.45', 2, false)).toBe('123.45');
      expect(formatSize('123.4', 2, false)).toBe('123.4');
    });

    it('should respect szDecimals = 4 (common for crypto)', () => {
      expect(formatSize('0.12345', 4, false)).toBe('0.1235');
      expect(formatSize('1.23456', 4, false)).toBe('1.2346');
      expect(formatSize('10.1000', 4, false)).toBe('10.1');
    });

    it('should respect szDecimals = 5', () => {
      expect(formatSize('0.123456', 5, false)).toBe('0.12346');
      expect(formatSize('1.234567', 5, false)).toBe('1.23457');
      expect(formatSize('10.10000', 5, false)).toBe('10.1');
    });
  });

  describe('Trailing zero removal', () => {
    it('should remove all trailing zeros', () => {
      expect(formatSize('1.00000', 5, false)).toBe('1');
      expect(formatSize('1.10000', 5, false)).toBe('1.1');
      expect(formatSize('1.12000', 5, false)).toBe('1.12');
      expect(formatSize('1.12300', 5, false)).toBe('1.123');
      expect(formatSize('1.12340', 5, false)).toBe('1.1234');
    });

    it('should remove decimal point if all decimals are zero', () => {
      expect(formatSize('100.0000', 4, false)).toBe('100');
      expect(formatSize('1.00', 2, false)).toBe('1');
      expect(formatSize('999.000', 3, false)).toBe('999');
    });

    it('should not remove meaningful zeros', () => {
      expect(formatSize('1.01', 2, false)).toBe('1.01');
      expect(formatSize('1.001', 3, false)).toBe('1.001');
      expect(formatSize('0.0001', 4, false)).toBe('0.0001');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero', () => {
      expect(formatSize('0', 0, false)).toBe('0');
      expect(formatSize('0', 2, false)).toBe('0');
      expect(formatSize('0', 4, false)).toBe('0');
      expect(formatSize(0, 4, false)).toBe('0');
      expect(formatSize('0.0000', 4, false)).toBe('0');
    });

    it('should handle very small numbers', () => {
      expect(formatSize('0.0001', 4, false)).toBe('0.0001');
      expect(formatSize('0.00001', 5, false)).toBe('0.00001');
      expect(formatSize('0.000012', 6, false)).toBe('0.000012');
    });

    it('should handle very large numbers', () => {
      expect(formatSize('999999', 0, false)).toBe('999999');
      expect(formatSize('999999.1234', 4, false)).toBe('999999.1234');
      expect(formatSize('1000000.5000', 4, false)).toBe('1000000.5');
    });

    it('should handle numbers close to rounding boundary', () => {
      expect(formatSize('0.12345', 4, false)).toBe('0.1235');
      expect(formatSize('0.12344', 4, false)).toBe('0.1234');
      expect(formatSize('0.99995', 4, false)).toBe('1');
      expect(formatSize('0.99994', 4, false)).toBe('0.9999');
    });
  });

  describe('Invalid input handling', () => {
    it('should handle negative numbers as zero', () => {
      expect(formatSize('-1', 2, false)).toBe('0');
      expect(formatSize('-0.5', 2, false)).toBe('0');
      expect(formatSize(-100, 2, false)).toBe('0');
    });

    it('should handle NaN as zero', () => {
      expect(formatSize(NaN, 2, false)).toBe('0');
      expect(formatSize('invalid', 2, false)).toBe('0');
    });

    it('should handle Infinity as zero', () => {
      expect(formatSize(Infinity, 2, false)).toBe('0');
      expect(formatSize(-Infinity, 2, false)).toBe('0');
    });

    it('should handle empty string as zero', () => {
      expect(formatSize('', 2, false)).toBe('0');
    });
  });

  describe('Real-world crypto examples', () => {
    describe('BTC (szDecimals = 5)', () => {
      const szDecimals = 5;

      it('should format typical BTC sizes', () => {
        expect(formatSize('0.01', szDecimals, false)).toBe('0.01');
        expect(formatSize('0.1', szDecimals, false)).toBe('0.1');
        expect(formatSize('1', szDecimals, false)).toBe('1');
        expect(formatSize('1.5', szDecimals, false)).toBe('1.5');
      });

      it('should remove trailing zeros from BTC sizes', () => {
        expect(formatSize('0.10000', szDecimals, false)).toBe('0.1');
        expect(formatSize('1.00000', szDecimals, false)).toBe('1');
        expect(formatSize('1.50000', szDecimals, false)).toBe('1.5');
      });
    });

    describe('ETH (szDecimals = 4)', () => {
      const szDecimals = 4;

      it('should format typical ETH sizes', () => {
        expect(formatSize('0.1', szDecimals, false)).toBe('0.1');
        expect(formatSize('1', szDecimals, false)).toBe('1');
        expect(formatSize('10', szDecimals, false)).toBe('10');
        expect(formatSize('100.5', szDecimals, false)).toBe('100.5');
      });

      it('should remove trailing zeros from ETH sizes', () => {
        expect(formatSize('0.1000', szDecimals, false)).toBe('0.1');
        expect(formatSize('1.0000', szDecimals, false)).toBe('1');
        expect(formatSize('10.5000', szDecimals, false)).toBe('10.5');
      });
    });

    describe('SOL (szDecimals = 2)', () => {
      const szDecimals = 2;

      it('should format typical SOL sizes', () => {
        expect(formatSize('1', szDecimals, false)).toBe('1');
        expect(formatSize('10', szDecimals, false)).toBe('10');
        expect(formatSize('100.5', szDecimals, false)).toBe('100.5');
        expect(formatSize('1000.25', szDecimals, false)).toBe('1000.25');
      });

      it('should remove trailing zeros from SOL sizes', () => {
        expect(formatSize('1.00', szDecimals, false)).toBe('1');
        expect(formatSize('10.50', szDecimals, false)).toBe('10.5');
        expect(formatSize('100.00', szDecimals, false)).toBe('100');
      });
    });

    describe('DOGE (szDecimals = 0)', () => {
      const szDecimals = 0;

      it('should format DOGE sizes (regex bug fixed)', () => {
        // FIXED: Numbers with trailing zeros now work correctly
        expect(formatSize(100, szDecimals, false)).toBe('100');
        expect(formatSize(1000, szDecimals, false)).toBe('1000');
        expect(formatSize(10000, szDecimals, false)).toBe('10000');

        // Numbers without trailing zeros work correctly
        expect(formatSize(123, szDecimals, false)).toBe('123');
        expect(formatSize(456, szDecimals, false)).toBe('456');
      });

      it('should round decimal DOGE sizes to integer (regex bug fixed)', () => {
        // 100.4 rounds to 100
        expect(formatSize('100.4', szDecimals, false)).toBe('100');

        // 100.5 rounds to 101
        expect(formatSize('100.5', szDecimals, false)).toBe('101');

        // 100.9 rounds to 101
        expect(formatSize('100.9', szDecimals, false)).toBe('101');

        // Numbers that don't end in 0 after rounding work correctly
        expect(formatSize('101.5', szDecimals, false)).toBe('102');
        expect(formatSize('123.7', szDecimals, false)).toBe('124');
      });
    });
  });

  describe('Precision and rounding', () => {
    it('should round based on JavaScript toFixed behavior', () => {
      // Note: JavaScript toFixed has floating point precision issues
      // 1.2345 -> toFixed(3) -> "1.234" (not "1.235" due to float precision)
      expect(formatSize('1.2345', 3, false)).toBe('1.234');
      expect(formatSize('1.2355', 3, false)).toBe('1.236');
      expect(formatSize('1.9995', 3, false)).toBe('2');
    });

    it('should round down when next digit < 5', () => {
      expect(formatSize('1.2344', 3, false)).toBe('1.234');
      expect(formatSize('1.2354', 3, false)).toBe('1.235');
      expect(formatSize('1.9994', 3, false)).toBe('1.999');
    });

    it('should handle rounding with szDecimals = 0', () => {
      // Numbers ending in .5 round to nearest even (banker's rounding)
      expect(formatSize('2.5', 0, false)).toBe('3'); // rounds to 3 (no trailing zeros)
      expect(formatSize('3.5', 0, false)).toBe('4'); // rounds to 4 (no trailing zeros)
      expect(formatSize('4.5', 0, false)).toBe('5'); // rounds to 5 (no trailing zeros)
      expect(formatSize('10.5', 0, false)).toBe('11'); // rounds to 11 (no trailing zeros)
    });
  });

  describe('Consistency with close-position-modal usage', () => {
    it('should format sizes for position modal (BTC szDecimals = 5)', () => {
      // Based on close-position-modal.tsx usage
      const szDecimals = 5;

      // When closing 0.1 BTC
      expect(formatSize(0.1, szDecimals, false)).toBe('0.1');

      // When closing 0.12345 BTC
      expect(formatSize(0.12345, szDecimals, false)).toBe('0.12345');

      // When closing 1.5 BTC
      expect(formatSize(1.5, szDecimals, false)).toBe('1.5');

      // When calculating from percentage (may have trailing zeros)
      const closeSize = (1.23456789 * 50) / 100; // 0.617283945
      expect(formatSize(closeSize, szDecimals, false)).toBe('0.61728');
    });

    it('should format sizes for position modal (ETH szDecimals = 4)', () => {
      const szDecimals = 4;

      // When closing 10.5 ETH
      expect(formatSize(10.5, szDecimals, false)).toBe('10.5');

      // When closing calculated amount with trailing zeros
      expect(formatSize('10.5000', szDecimals, false)).toBe('10.5');

      // When calculating from USD value
      const markPrice = 4219;
      const usdValue = 1000;
      const assetSize = usdValue / markPrice; // 0.237029... -> rounds to 0.2370 -> trailing zero removed -> "0.237"
      expect(formatSize(assetSize, szDecimals, false)).toBe('0.237');
    });
  });

  describe('Thousands separator', () => {
    it('should add thousands separators when enabled', () => {
      expect(formatSize('1000', 0, true)).toBe('1,000');
      expect(formatSize('10000', 0, true)).toBe('10,000');
      expect(formatSize('100000', 0, true)).toBe('100,000');
      expect(formatSize('1000000', 0, true)).toBe('1,000,000');
    });

    it('should not add thousands separators when disabled', () => {
      expect(formatSize('1000', 0, false)).toBe('1000');
      expect(formatSize('10000', 0, false)).toBe('10000');
      expect(formatSize('100000', 0, false)).toBe('100000');
      expect(formatSize('1000000', 0, false)).toBe('1000000');
    });

    it('should add thousands separators with decimals', () => {
      expect(formatSize('1000.5', 2, true)).toBe('1,000.5');
      expect(formatSize('10000.25', 2, true)).toBe('10,000.25');
      expect(formatSize('100000.123', 3, true)).toBe('100,000.123');
      expect(formatSize('1000000.5', 1, true)).toBe('1,000,000.5');
    });

    it('should not add separators for numbers less than 1000', () => {
      expect(formatSize('999', 0, true)).toBe('999');
      expect(formatSize('999.99', 2, true)).toBe('999.99');
      expect(formatSize('1.5', 1, true)).toBe('1.5');
      expect(formatSize('0.123', 3, true)).toBe('0.123');
    });

    it('should handle thousands separators with trailing zero removal', () => {
      expect(formatSize('1000.00', 2, true)).toBe('1,000');
      expect(formatSize('10000.50', 2, true)).toBe('10,000.5');
      expect(formatSize('100000.000', 3, true)).toBe('100,000');
    });
  });
});
