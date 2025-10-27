/**
 * Manual test file for price formatting
 * Run with: npx tsx lib/hyperliquid/__test-price-format.ts
 */

import { formatPrice } from './price-format';

interface TestCase {
  coin: string;
  szDecimals: number;
  maxDecimals: number;
  price: string | number;
  expected: string;
  reason: string;
}

const testCases: TestCase[] = [
  // ETH (szDecimals=4, maxDecimalPlaces=2)
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: 4219,
    expected: '4219.0',
    reason: '4 sig figs → pad 1 decimal to reach 5',
  },
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: 123,
    expected: '123.00',
    reason: '3 sig figs → pad 2 decimals to reach 5',
  },
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: 4219.5,
    expected: '4219.5',
    reason: '5 sig figs → no padding needed',
  },
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: '4219.50',
    expected: '4219.5',
    reason: '5 sig figs → remove trailing zero',
  },
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: 4180.6,
    expected: '4180.6',
    reason: '5 sig figs → no padding',
  },
  {
    coin: 'ETH',
    szDecimals: 4,
    maxDecimals: 6,
    price: 4220,
    expected: '4220.0',
    reason: '4 sig figs (trailing zero counts for integers) → pad 1 decimal to reach 5',
  },

  // BTC (szDecimals=5, maxDecimalPlaces=1)
  {
    coin: 'BTC',
    szDecimals: 5,
    maxDecimals: 6,
    price: 114971,
    expected: '114971',
    reason: '6 sig figs → no padding, remove .0',
  },
  {
    coin: 'BTC',
    szDecimals: 5,
    maxDecimals: 6,
    price: 1149,
    expected: '1149.0',
    reason: '4 sig figs → pad 1 decimal to reach 5',
  },
  {
    coin: 'BTC',
    szDecimals: 5,
    maxDecimals: 6,
    price: '114971.0',
    expected: '114971',
    reason: '6 sig figs → no padding, remove .0',
  },

  // DOGE (szDecimals=0, maxDecimalPlaces=6)
  {
    coin: 'DOGE',
    szDecimals: 0,
    maxDecimals: 6,
    price: 0.2,
    expected: '0.20000',
    reason: '1 sig fig → pad 4 decimals to reach 5',
  },
  {
    coin: 'DOGE',
    szDecimals: 0,
    maxDecimals: 6,
    price: 0.20359,
    expected: '0.20359',
    reason: '5 sig figs → no padding',
  },
  {
    coin: 'DOGE',
    szDecimals: 0,
    maxDecimals: 6,
    price: '0.203590',
    expected: '0.20359',
    reason: '5 sig figs → remove trailing zero',
  },

  // PUMP (szDecimals=0, maxDecimalPlaces=6)
  {
    coin: 'PUMP',
    szDecimals: 0,
    maxDecimals: 6,
    price: 0.004705,
    expected: '0.004705',
    reason: '4 sig figs → pad 1 decimal to reach 5... wait',
  },
  {
    coin: 'PUMP',
    szDecimals: 0,
    maxDecimals: 6,
    price: 0.00471,
    expected: '0.004710',
    reason: '3 sig figs → pad 2 decimals (capped by max=6) → 4 sig figs',
  },
];

console.log('Testing formatPrice function:\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = formatPrice(testCase.price, testCase.szDecimals, testCase.maxDecimals);
  const isPass = result === testCase.expected;

  if (isPass) {
    passed++;
    console.log(`✅ ${testCase.coin}: ${testCase.price} → "${result}"`);
  } else {
    failed++;
    console.log(
      `❌ ${testCase.coin}: ${testCase.price} → "${result}" (expected "${testCase.expected}")`,
    );
    console.log(`   Reason: ${testCase.reason}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
