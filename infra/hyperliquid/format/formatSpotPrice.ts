/**
 * Format price for Spot markets (MAX_DECIMALS = 8)
 *
 * This function will format prices for Spot markets using the same 5-sig-fig rule
 * as formatPrice, but with MAX_DECIMALS = 8 instead of 6.
 *
 * @param _price - Price from API (string or number)
 * @param _szDecimals - Asset's szDecimals (from Hyperliquid meta)
 * @param _thousandsSeparator - Whether to add thousand separators (required)
 * @returns Formatted price string with appropriate precision for Spot markets
 * @throws Error - Not yet implemented
 */
export function formatSpotPrice(
  _price: string | number,
  _szDecimals: number,
  _thousandsSeparator: boolean,
): string {
  throw new Error(
    'formatSpotPrice is not yet implemented. This function will be used for Spot markets with MAX_DECIMALS = 8.',
  );
}
