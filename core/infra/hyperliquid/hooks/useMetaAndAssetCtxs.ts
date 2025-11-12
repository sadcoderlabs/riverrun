import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import * as infoClient from '../client/infoClient';

/**
 * Market metadata for a specific coin
 */
export interface MarketMetadata {
  markPx: string;
  szDecimals: number;
}

/**
 * Hook to fetch market metadata and asset contexts using TanStack Query
 *
 * This hook fetches metaAndAssetCtxs from Hyperliquid API and provides:
 * - Raw meta and assetCtxs data
 * - Computed marketDataMap for easy lookup by coin symbol
 *
 * Uses TanStack Query with 1 minute stale time since this data changes infrequently.
 *
 * @example
 * ```typescript
 * const { marketDataMap, meta, assetCtxs, isLoading } = useMetaAndAssetCtxs();
 *
 * // Look up market data by coin
 * const btcData = marketDataMap.get('BTC');
 * if (btcData) {
 *   console.log('BTC markPx:', btcData.markPx);
 *   console.log('BTC szDecimals:', btcData.szDecimals);
 * }
 * ```
 */
export function useMetaAndAssetCtxs() {
  const {
    data: rawData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metaAndAssetCtxs'],
    queryFn: async () => {
      const metaAndAssetCtxs = await infoClient.metaAndAssetCtxs();
      return metaAndAssetCtxs;
    },
    staleTime: 60000, // 1 minute - market metadata changes infrequently
  });

  // Extract meta and assetCtxs from response
  const meta = rawData?.[0];
  const assetCtxs = rawData?.[1];

  // Create lookup map: coin symbol -> market metadata
  const marketDataMap = useMemo(() => {
    const dataMap = new Map<string, MarketMetadata>();

    if (!meta || !assetCtxs) {
      return dataMap;
    }

    meta.universe.forEach((asset, index) => {
      const assetCtx = assetCtxs[index];
      if (assetCtx) {
        dataMap.set(asset.name, {
          markPx: assetCtx.markPx,
          szDecimals: asset.szDecimals,
        });
      }
    });

    return dataMap;
  }, [meta, assetCtxs]);

  return {
    /** Raw meta data (market universe, symbols, etc.) */
    meta,
    /** Raw asset contexts (prices, funding rates, etc.) */
    assetCtxs,
    /** Lookup map: coin symbol -> market metadata */
    marketDataMap,
    /** Loading state */
    isLoading,
    /** Error state */
    error: error instanceof Error ? error : undefined,
  };
}
