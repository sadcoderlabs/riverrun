import { formatValue } from '../formatValue';

describe('formatValue', () => {
  describe('Basic functionality with 2 decimals (default)', () => {
    it('should format with thousand separators and 2 decimals', () => {
      expect(formatValue('1234.56', 2)).toBe('1,234.56');
      expect(formatValue('1234567.89', 2)).toBe('1,234,567.89');
      expect(formatValue(1000000, 2)).toBe('1,000,000.00');
    });

    it('should handle string input', () => {
      expect(formatValue('100.5', 2)).toBe('100.50');
      expect(formatValue('1000.123', 2)).toBe('1,000.12');
    });

    it('should handle number input', () => {
      expect(formatValue(100.5, 2)).toBe('100.50');
      expect(formatValue(1000.123, 2)).toBe('1,000.12');
    });

    it('should require decimals parameter to be specified', () => {
      expect(formatValue('1234.56', 2)).toBe('1,234.56');
      expect(formatValue(1000, 2)).toBe('1,000.00');
      expect(formatValue('1234.56', 0)).toBe('1,235');
      expect(formatValue(1000, 0)).toBe('1,000');
    });
  });

  describe('Integer display (0 decimals)', () => {
    it('should format as integer with thousand separators', () => {
      expect(formatValue('1234.56', 0)).toBe('1,235');
      expect(formatValue('1234567.89', 0)).toBe('1,234,568');
      expect(formatValue(1000000, 0)).toBe('1,000,000');
    });

    it('should round to nearest integer', () => {
      expect(formatValue('1234.4', 0)).toBe('1,234');
      expect(formatValue('1234.5', 0)).toBe('1,235');
      expect(formatValue('1234.9', 0)).toBe('1,235');
    });
  });

  describe('Thousand separators (always applied)', () => {
    it('should add thousand separators for numbers >= 1000', () => {
      expect(formatValue('1000', 2)).toBe('1,000.00');
      expect(formatValue('10000', 2)).toBe('10,000.00');
      expect(formatValue('100000', 2)).toBe('100,000.00');
      expect(formatValue('1000000', 2)).toBe('1,000,000.00');
    });

    it('should not add separators for numbers < 1000', () => {
      expect(formatValue('999', 2)).toBe('999.00');
      expect(formatValue('123.45', 2)).toBe('123.45');
      expect(formatValue('0.5', 2)).toBe('0.50');
    });

    it('should add thousand separators with integer display', () => {
      expect(formatValue('1000', 0)).toBe('1,000');
      expect(formatValue('10000', 0)).toBe('10,000');
      expect(formatValue('1234567', 0)).toBe('1,234,567');
    });
  });

  describe('Trailing zeros (kept for financial values)', () => {
    it('should keep trailing zeros with 2 decimals', () => {
      expect(formatValue('100', 2)).toBe('100.00');
      expect(formatValue('100.5', 2)).toBe('100.50');
      expect(formatValue('1000.10', 2)).toBe('1,000.10');
    });

    it('should not have trailing zeros with 0 decimals', () => {
      expect(formatValue('100', 0)).toBe('100');
      expect(formatValue('100.5', 0)).toBe('101');
      expect(formatValue('1000.99', 0)).toBe('1,001');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero', () => {
      expect(formatValue('0', 2)).toBe('0.00');
      expect(formatValue(0, 2)).toBe('0.00');
      expect(formatValue('0.00', 2)).toBe('0.00');
      expect(formatValue('0', 0)).toBe('0');
      expect(formatValue(0, 0)).toBe('0');
    });

    it('should handle negative values (for PnL)', () => {
      expect(formatValue('-123.45', 2)).toBe('-123.45');
      expect(formatValue(-1234.56, 2)).toBe('-1,234.56');
      expect(formatValue('-1234567.89', 2)).toBe('-1,234,567.89');
      expect(formatValue('-123.45', 0)).toBe('-123');
      expect(formatValue(-1234.56, 0)).toBe('-1,235');
    });

    it('should handle very small values', () => {
      expect(formatValue('0.01', 2)).toBe('0.01');
      expect(formatValue('0.5', 2)).toBe('0.50');
      expect(formatValue('0.99', 2)).toBe('0.99');
      expect(formatValue('0.5', 0)).toBe('1');
      expect(formatValue('0.99', 0)).toBe('1');
    });

    it('should handle very large values', () => {
      expect(formatValue('999999.99', 2)).toBe('999,999.99');
      expect(formatValue('1234567.89', 2)).toBe('1,234,567.89');
      expect(formatValue('123456789.12', 2)).toBe('123,456,789.12');
      expect(formatValue('123456789', 0)).toBe('123,456,789');
    });

    it('should handle rounding at boundary', () => {
      expect(formatValue('123.444', 2)).toBe('123.44');
      // 123.445 rounds to 123.44 due to floating point precision
      expect(formatValue('123.445', 2)).toBe('123.44');
      // 123.455 rounds to 123.45 due to floating point precision
      expect(formatValue('123.455', 2)).toBe('123.45');
    });
  });

  describe('Invalid input handling', () => {
    it('should handle NaN as zero', () => {
      expect(formatValue(NaN, 2)).toBe('0.00');
      expect(formatValue('invalid', 2)).toBe('0.00');
      expect(formatValue(NaN, 0)).toBe('0');
      expect(formatValue('invalid', 0)).toBe('0');
    });

    it('should handle Infinity as zero', () => {
      expect(formatValue(Infinity, 2)).toBe('0.00');
      expect(formatValue(-Infinity, 2)).toBe('0.00');
      expect(formatValue(Infinity, 0)).toBe('0');
      expect(formatValue(-Infinity, 0)).toBe('0');
    });

    it('should handle empty string as zero', () => {
      expect(formatValue('', 2)).toBe('0.00');
      expect(formatValue('', 0)).toBe('0');
    });
  });

  describe('Real-world USDC value examples', () => {
    describe('Available to Trade', () => {
      it('should format typical available amounts', () => {
        expect(formatValue('1234.56', 2)).toBe('1,234.56');
        expect(formatValue('10000.00', 2)).toBe('10,000.00');
        expect(formatValue('0.50', 2)).toBe('0.50');
      });
    });

    describe('Margin Used', () => {
      it('should format typical margin amounts', () => {
        expect(formatValue('50.25', 2)).toBe('50.25');
        expect(formatValue('500.00', 2)).toBe('500.00');
        expect(formatValue('5000.75', 2)).toBe('5,000.75');
      });
    });

    describe('Order Value', () => {
      it('should format typical order values', () => {
        expect(formatValue('100.50', 2)).toBe('100.50');
        expect(formatValue('1500.25', 2)).toBe('1,500.25');
        expect(formatValue('50000.00', 2)).toBe('50,000.00');
      });
    });

    describe('Position Value (may use integer display)', () => {
      it('should format large position values as integers', () => {
        expect(formatValue('1234.56', 0)).toBe('1,235');
        expect(formatValue('50000.25', 0)).toBe('50,000');
        expect(formatValue('123456.78', 0)).toBe('123,457');
      });
    });

    describe('Account Balance', () => {
      it('should format typical account balances', () => {
        expect(formatValue('100.00', 2)).toBe('100.00');
        expect(formatValue('10000.50', 2)).toBe('10,000.50');
        expect(formatValue('1234567.89', 2)).toBe('1,234,567.89');
      });
    });

    describe('Unrealized PnL (can be negative)', () => {
      it('should format PnL with proper sign', () => {
        expect(formatValue('500.25', 2)).toBe('500.25');
        expect(formatValue('-250.50', 2)).toBe('-250.50');
        expect(formatValue('-1234.56', 2)).toBe('-1,234.56');
        expect(formatValue('0', 2)).toBe('0.00');
      });
    });
  });

  describe('Comparison with formatSize behavior', () => {
    it('should KEEP trailing zeros unlike formatSize', () => {
      // formatSize would return "1.5", but formatValue returns "1.50"
      expect(formatValue('1.5', 2)).toBe('1.50');
      expect(formatValue('100.0', 2)).toBe('100.00');
      expect(formatValue('1000.50', 2)).toBe('1,000.50');
    });

    it('should support negative values unlike formatPrice', () => {
      // formatPrice returns "0" for negative, but formatValue preserves sign
      expect(formatValue('-100', 2)).toBe('-100.00');
      expect(formatValue(-1234.56, 2)).toBe('-1,234.56');
    });

    it('should ALWAYS add thousand separators', () => {
      // No boolean parameter - always applied
      expect(formatValue('1000', 2)).toBe('1,000.00');
      expect(formatValue('10000', 0)).toBe('10,000');
    });
  });
});
