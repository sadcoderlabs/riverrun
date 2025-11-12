import { formatSizeFixedDecimals } from '../formatSizeFixedDecimals';

describe('formatSizeFixedDecimals', () => {
  describe('Basic functionality', () => {
    it('should format size with fixed decimal places (no trailing zero removal)', () => {
      expect(formatSizeFixedDecimals('0.1000', 4, false)).toBe('0.1000');
      expect(formatSizeFixedDecimals('1.5000', 4, false)).toBe('1.5000');
      expect(formatSizeFixedDecimals('10.2500', 4, false)).toBe('10.2500');
    });

    it('should pad with zeros to reach szDecimals', () => {
      expect(formatSizeFixedDecimals('0.1', 4, false)).toBe('0.1000');
      expect(formatSizeFixedDecimals('1.5', 4, false)).toBe('1.5000');
      expect(formatSizeFixedDecimals('10.25', 4, false)).toBe('10.2500');
    });

    it('should handle string input', () => {
      expect(formatSizeFixedDecimals('0.123', 5, false)).toBe('0.12300');
      expect(formatSizeFixedDecimals('1.234', 5, false)).toBe('1.23400');
      expect(formatSizeFixedDecimals('100.5', 5, false)).toBe('100.50000');
    });

    it('should handle number input', () => {
      expect(formatSizeFixedDecimals(0.123, 5, false)).toBe('0.12300');
      expect(formatSizeFixedDecimals(1.234, 5, false)).toBe('1.23400');
      expect(formatSizeFixedDecimals(100.5, 5, false)).toBe('100.50000');
    });
  });

  describe('Decimal precision (szDecimals)', () => {
    it('should respect szDecimals = 0', () => {
      expect(formatSizeFixedDecimals('123', 0, false)).toBe('123');
      expect(formatSizeFixedDecimals('123.456', 0, false)).toBe('123');
      expect(formatSizeFixedDecimals(123.456, 0, false)).toBe('123');
    });

    it('should respect szDecimals = 1', () => {
      expect(formatSizeFixedDecimals('123.456', 1, false)).toBe('123.5');
      expect(formatSizeFixedDecimals('123.45', 1, false)).toBe('123.5');
      expect(formatSizeFixedDecimals('123.9', 1, false)).toBe('123.9');
      expect(formatSizeFixedDecimals('123', 1, false)).toBe('123.0');
    });

    it('should respect szDecimals = 2', () => {
      expect(formatSizeFixedDecimals('123.456', 2, false)).toBe('123.46');
      expect(formatSizeFixedDecimals('123.45', 2, false)).toBe('123.45');
      expect(formatSizeFixedDecimals('123.4', 2, false)).toBe('123.40');
      expect(formatSizeFixedDecimals('123', 2, false)).toBe('123.00');
    });

    it('should respect szDecimals = 4 (common for crypto)', () => {
      expect(formatSizeFixedDecimals('0.12345', 4, false)).toBe('0.1235');
      expect(formatSizeFixedDecimals('1.23456', 4, false)).toBe('1.2346');
      expect(formatSizeFixedDecimals('10.1000', 4, false)).toBe('10.1000');
      expect(formatSizeFixedDecimals('10.1', 4, false)).toBe('10.1000');
    });

    it('should respect szDecimals = 5 (BTC)', () => {
      expect(formatSizeFixedDecimals('0.123456', 5, false)).toBe('0.12346');
      expect(formatSizeFixedDecimals('1.234567', 5, false)).toBe('1.23457');
      expect(formatSizeFixedDecimals('10.10000', 5, false)).toBe('10.10000');
      expect(formatSizeFixedDecimals('12.014', 5, false)).toBe('12.01400');
      expect(formatSizeFixedDecimals('12.01440', 5, false)).toBe('12.01440');
      expect(formatSizeFixedDecimals('12', 5, false)).toBe('12.00000');
    });

    it('should respect szDecimals = 6', () => {
      expect(formatSizeFixedDecimals('0.1234567', 6, false)).toBe('0.123457');
      expect(formatSizeFixedDecimals('1.2345678', 6, false)).toBe('1.234568');
      expect(formatSizeFixedDecimals('10.100000', 6, false)).toBe('10.100000');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero', () => {
      expect(formatSizeFixedDecimals('0', 0, false)).toBe('0');
      expect(formatSizeFixedDecimals('0', 2, false)).toBe('0.00');
      expect(formatSizeFixedDecimals('0', 4, false)).toBe('0.0000');
      expect(formatSizeFixedDecimals('0', 5, false)).toBe('0.00000');
      expect(formatSizeFixedDecimals(0, 5, false)).toBe('0.00000');
    });

    it('should handle very small numbers', () => {
      expect(formatSizeFixedDecimals('0.00001', 5, false)).toBe('0.00001');
      expect(formatSizeFixedDecimals('0.000001', 6, false)).toBe('0.000001');
      expect(formatSizeFixedDecimals('0.0000001', 6, false)).toBe('0.000000');
    });

    it('should handle very large numbers', () => {
      expect(formatSizeFixedDecimals('999999', 2, false)).toBe('999999.00');
      expect(formatSizeFixedDecimals('1000000', 2, false)).toBe('1000000.00');
      expect(formatSizeFixedDecimals('123456.789', 3, false)).toBe('123456.789');
    });

    it('should handle negative sizes gracefully (return 0)', () => {
      expect(formatSizeFixedDecimals('-1', 2, false)).toBe('0');
      expect(formatSizeFixedDecimals(-10.5, 3, false)).toBe('0');
    });

    it('should handle invalid inputs', () => {
      expect(formatSizeFixedDecimals('invalid', 2, false)).toBe('0');
      expect(formatSizeFixedDecimals(NaN, 2, false)).toBe('0');
      expect(formatSizeFixedDecimals(Infinity, 2, false)).toBe('0');
    });
  });

  describe('Thousand separators', () => {
    it('should add thousand separators when requested', () => {
      expect(formatSizeFixedDecimals('1000', 2, true)).toBe('1,000.00');
      expect(formatSizeFixedDecimals('1234.5', 2, true)).toBe('1,234.50');
      expect(formatSizeFixedDecimals('1234567.89', 2, true)).toBe('1,234,567.89');
    });

    it('should not add thousand separators when not requested', () => {
      expect(formatSizeFixedDecimals('1000', 2, false)).toBe('1000.00');
      expect(formatSizeFixedDecimals('1234.5', 2, false)).toBe('1234.50');
      expect(formatSizeFixedDecimals('1234567.89', 2, false)).toBe('1234567.89');
    });

    it('should handle thousand separators with various decimal places', () => {
      expect(formatSizeFixedDecimals('12345.6789', 4, true)).toBe('12,345.6789');
      expect(formatSizeFixedDecimals('12345.6789', 2, true)).toBe('12,345.68');
      expect(formatSizeFixedDecimals('12345', 0, true)).toBe('12,345');
    });

    it('should handle small numbers with thousand separators', () => {
      expect(formatSizeFixedDecimals('123.45', 2, true)).toBe('123.45');
      expect(formatSizeFixedDecimals('999.99', 2, true)).toBe('999.99');
      expect(formatSizeFixedDecimals('1000.01', 2, true)).toBe('1,000.01');
    });
  });

  describe('Real-world crypto examples', () => {
    describe('BTC (szDecimals=5)', () => {
      const szDecimals = 5;

      it('should format BTC sizes correctly', () => {
        expect(formatSizeFixedDecimals('0.01', szDecimals, false)).toBe('0.01000');
        expect(formatSizeFixedDecimals('0.5', szDecimals, false)).toBe('0.50000');
        expect(formatSizeFixedDecimals('1', szDecimals, false)).toBe('1.00000');
        expect(formatSizeFixedDecimals('12.014', szDecimals, false)).toBe('12.01400');
        expect(formatSizeFixedDecimals('12.01440', szDecimals, false)).toBe('12.01440');
        expect(formatSizeFixedDecimals('100.12345', szDecimals, false)).toBe('100.12345');
      });
    });

    describe('ETH (szDecimals=4)', () => {
      const szDecimals = 4;

      it('should format ETH sizes correctly', () => {
        expect(formatSizeFixedDecimals('0.1', szDecimals, false)).toBe('0.1000');
        expect(formatSizeFixedDecimals('1', szDecimals, false)).toBe('1.0000');
        expect(formatSizeFixedDecimals('10.5', szDecimals, false)).toBe('10.5000');
        expect(formatSizeFixedDecimals('100.1234', szDecimals, false)).toBe('100.1234');
      });
    });

    describe('SOL (szDecimals=3)', () => {
      const szDecimals = 3;

      it('should format SOL sizes correctly', () => {
        expect(formatSizeFixedDecimals('1', szDecimals, false)).toBe('1.000');
        expect(formatSizeFixedDecimals('10.5', szDecimals, false)).toBe('10.500');
        expect(formatSizeFixedDecimals('100.12', szDecimals, false)).toBe('100.120');
        expect(formatSizeFixedDecimals('1000.123', szDecimals, false)).toBe('1000.123');
      });
    });

    describe('DOGE (szDecimals=0)', () => {
      const szDecimals = 0;

      it('should format DOGE sizes correctly', () => {
        expect(formatSizeFixedDecimals('1', szDecimals, false)).toBe('1');
        expect(formatSizeFixedDecimals('10.5', szDecimals, false)).toBe('11');
        expect(formatSizeFixedDecimals('100', szDecimals, false)).toBe('100');
        expect(formatSizeFixedDecimals('1000.9', szDecimals, false)).toBe('1001');
      });
    });
  });

  describe('Alignment consistency (key feature for order books)', () => {
    it('should maintain consistent character length for same szDecimals', () => {
      const sizes = ['12.01440', '0.10000', '100.00000', '1.23456'];
      const formatted = sizes.map(s => formatSizeFixedDecimals(s, 5, false));

      // All should have same number of decimal places
      formatted.forEach(f => {
        const decimals = f.split('.')[1];
        expect(decimals?.length || 0).toBe(5);
      });
    });

    it('should keep trailing zeros for alignment', () => {
      expect(formatSizeFixedDecimals('1.1', 5, false)).toBe('1.10000');
      expect(formatSizeFixedDecimals('1.10', 5, false)).toBe('1.10000');
      expect(formatSizeFixedDecimals('1.100', 5, false)).toBe('1.10000');
      expect(formatSizeFixedDecimals('1.1000', 5, false)).toBe('1.10000');
      expect(formatSizeFixedDecimals('1.10000', 5, false)).toBe('1.10000');
    });
  });
});
