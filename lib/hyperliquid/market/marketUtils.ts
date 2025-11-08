/**
 * Utilities for handling Hyperliquid market IDs and conversions
 */

/**
 * Parse a market ID to extract the base asset name
 * @param marketId - Market ID in format "BTC-USD" (perp) or "BTC/USDC" (spot)
 * @returns Object with assetName and market type
 */
export function parseMarketId(marketId: string): {
  assetName: string;
  type: 'perp' | 'spot';
} {
  // Check if it's a perpetual market (uses hyphen: BTC-USD)
  if (marketId.includes('-USD')) {
    return {
      assetName: marketId.replace('-USD', ''),
      type: 'perp',
    };
  }

  // Check if it's a spot market (uses slash: BTC/USDC)
  if (marketId.includes('/')) {
    const [assetName] = marketId.split('/');
    return {
      assetName,
      type: 'spot',
    };
  }

  // Fallback: assume it's a raw asset name (backwards compatibility)
  return {
    assetName: marketId,
    type: 'perp',
  };
}

/**
 * Format an asset name to a market ID
 * @param assetName - Raw asset name like "BTC"
 * @param type - Market type
 * @returns Formatted market ID like "BTC-USD" or "BTC/USDC"
 */
export function formatMarketId(assetName: string, type: 'perp' | 'spot' = 'perp'): string {
  if (type === 'perp') {
    return `${assetName}-USD`;
  }
  return `${assetName}/USDC`;
}

/**
 * Find the asset index in the meta universe array
 * @param assetName - Raw asset name like "BTC"
 * @param universe - The meta.universe array from Hyperliquid API
 * @returns The index, or -1 if not found
 */
export function findAssetIndex(assetName: string, universe: any[]): number {
  return universe.findIndex(asset => {
    const name = asset.name.toUpperCase();
    return name === assetName.toUpperCase();
  });
}
