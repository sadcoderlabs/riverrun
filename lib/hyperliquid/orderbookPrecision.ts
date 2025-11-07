/**
 * Order Book Precision Calculation Utilities for Hyperliquid Perp
 *
 * This module implements the precision menu calculation logic for Hyperliquid order books,
 * following the exchange's rules:
 * - MAX_DECIMALS = 6 for Perp (8 for Spot)
 * - Significant figures ≤ 5 (except integers are always allowed)
 * - Decimal places ≤ (MAX_DECIMALS - szDecimals)
 *
 * Reference: spec/hyperliquid_orderbook_precision.md
 */

/**
 * nSigFigs parameter for Hyperliquid API
 * - null: Full precision (finest possible under exchange rules)
 * - 2-5: Number of significant figures to round to
 */
export type NSigFigs = 2 | 3 | 4 | 5 | null;

/**
 * Menu item representing a precision level
 */
export interface PrecisionMenuItem {
  step: number; // Price increment between adjacent rows
  label: string; // Human-readable label for UI (e.g., "0.01", "10")
  nSigFigs: NSigFigs; // Parameter to send to Hyperliquid API
}

/**
 * Maximum decimal places for Perp markets
 * Spot markets use 8 instead
 */
const DEFAULT_MAX_DECIMALS_PERP = 6;

/**
 * Calculate the minimum step size imposed by decimal place limits
 *
 * Formula: 10^(-(MAX_DECIMALS - szDecimals))
 *
 * @param szDecimals - Size decimals for the asset (from Hyperliquid meta)
 * @param maxDecimals - MAX_DECIMALS (6 for Perp, 8 for Spot)
 * @returns Minimum step size due to decimal place constraint
 */
function decimalsStep(szDecimals: number, maxDecimals = DEFAULT_MAX_DECIMALS_PERP): number {
  const D = Math.max(0, maxDecimals - szDecimals);
  return Math.pow(10, -D);
}

/**
 * Calculate step size for a given number of significant figures
 *
 * Formula: 10^(k - (n - 1))
 * where k = floor(log10(price)) is the order of magnitude
 *
 * @param price - Representative price
 * @param n - Number of significant figures (2-5)
 * @returns Step size for n significant figures
 */
function sigStepByN(price: number, n: Exclude<NSigFigs, null>): number {
  const k = Math.floor(Math.log10(Math.abs(price)));
  return Math.pow(10, k - (n - 1));
}

/**
 * Calculate the finest possible step size (full precision)
 *
 * Full precision is constrained by:
 * 1. Maximum 5 significant figures
 * 2. Maximum decimal places (MAX_DECIMALS - szDecimals)
 * 3. Integer exception: if k ≥ 5, integers are always allowed → step = 1
 *
 * @param price - Representative price
 * @param szDecimals - Size decimals for the asset
 * @param maxDecimals - MAX_DECIMALS (6 for Perp, 8 for Spot)
 * @returns Finest possible step size
 */
function fullStep(
  price: number,
  szDecimals: number,
  maxDecimals = DEFAULT_MAX_DECIMALS_PERP,
): number {
  const k = Math.floor(Math.log10(Math.abs(price)));
  const dec = decimalsStep(szDecimals, maxDecimals);
  const sf5 = Math.pow(10, k - 4); // 5 significant figures

  // Integer exception: for high prices (k ≥ 5), integer prices are always allowed
  // Example: BTC at ~114971 (k=5) can use step=1
  if (k >= 5) return 1;

  // Otherwise, use the larger of: 5-sig-fig constraint or decimal constraint
  return Math.max(sf5, dec);
}

/**
 * Calculate step size for a specific nSigFigs value
 *
 * @param price - Representative price
 * @param szDecimals - Size decimals for the asset
 * @param n - Number of significant figures (null for full, or 2-5)
 * @param maxDecimals - MAX_DECIMALS (6 for Perp, 8 for Spot)
 * @returns Step size for the specified precision
 */
function stepFor(
  price: number,
  szDecimals: number,
  n: NSigFigs,
  maxDecimals = DEFAULT_MAX_DECIMALS_PERP,
): number {
  if (n === null) return fullStep(price, szDecimals, maxDecimals);
  return Math.max(sigStepByN(price, n), decimalsStep(szDecimals, maxDecimals));
}

/**
 * Check if two numbers are approximately equal (within floating point tolerance)
 *
 * @param a - First number
 * @param b - Second number
 * @returns True if numbers are approximately equal
 */
function approxEqual(a: number, b: number): boolean {
  const eps = 1e-12;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= eps * scale;
}

/**
 * Format step size as human-readable label
 *
 * Examples:
 * - 1 → "1"
 * - 0.01 → "0.01"
 * - 0.00001 → "0.00001"
 *
 * @param step - Step size to format
 * @returns Human-readable string (no scientific notation)
 */
function toLabel(step: number): string {
  // For values >= 1, show as integer
  if (step >= 1) return String(Math.trunc(step));

  // For values < 1, show as decimal with appropriate precision
  let decimals = 0;
  let s = step;
  while (s < 1 && decimals < 10) {
    s *= 10;
    decimals++;
  }

  // Format with calculated decimals, remove trailing zeros
  return step.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '') || '0';
}

/**
 * Build precision menu for order book display
 *
 * This is the main function that generates the precision selector menu items.
 *
 * Algorithm:
 * 1. Calculate step sizes for all candidates: [null, 5, 4, 3, 2]
 * 2. Deduplicate: if same step, prefer null (full); otherwise prefer larger n
 * 3. Sort by step size (ascending = finest to coarsest)
 * 4. Format labels for UI display
 *
 * Examples:
 * - BTC (sz=5, P≈114971): [1(null), 10(5), 100(4), 1000(3), 10000(2)]
 * - ETH (sz=4, P≈4180): [0.1(null), 1(4), 10(3), 100(2)]
 * - PUMP (sz=0, P≈0.004705): [0.000001(null), 0.00001(3), 0.0001(2)]
 *
 * @param price - Representative price (should use mark price)
 * @param szDecimals - Size decimals from Hyperliquid meta
 * @param maxDecimals - MAX_DECIMALS (6 for Perp, 8 for Spot)
 * @returns Array of menu items sorted by step size (finest first)
 * @throws Error if price is invalid
 */
export function buildPrecisionMenu(
  price: number,
  szDecimals: number,
  maxDecimals = DEFAULT_MAX_DECIMALS_PERP,
): PrecisionMenuItem[] {
  if (!(price > 0)) {
    throw new Error('price must be > 0');
  }

  // Calculate step sizes for all candidates
  const candidates: { n: NSigFigs; step: number }[] = [null, 5, 4, 3, 2].map(n => ({
    n: n as NSigFigs,
    step: stepFor(price, szDecimals, n as NSigFigs, maxDecimals),
  }));

  // Deduplicate: prefer null (full precision) if present; otherwise prefer larger n
  const unique = new Map<number, { n: NSigFigs; step: number }>();
  for (const { n, step } of candidates) {
    // Check if this step already exists (within floating point tolerance)
    let keyHit: number | undefined;
    for (const key of unique.keys()) {
      if (approxEqual(key, step)) {
        keyHit = key;
        break;
      }
    }

    if (keyHit === undefined) {
      // New unique step, add it
      unique.set(step, { n, step });
    } else {
      // Duplicate step found, decide which to keep
      const cur = unique.get(keyHit)!;

      // If current is null (full), keep it
      if (cur.n === null) continue;

      // If new is null, replace with it
      if (n === null) {
        unique.set(keyHit, { n, step: keyHit });
      }
      // If both are numbers, keep the larger n (closer to full precision)
      else if (typeof cur.n === 'number' && typeof n === 'number' && n > cur.n) {
        unique.set(keyHit, { n, step: keyHit });
      }
    }
  }

  // Sort by step size (ascending = finest first) and format labels
  return Array.from(unique.values())
    .sort((a, b) => a.step - b.step)
    .map(({ n, step }) => ({
      step,
      label: toLabel(step),
      nSigFigs: n,
    }));
}
