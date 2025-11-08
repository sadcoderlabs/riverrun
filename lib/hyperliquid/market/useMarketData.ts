import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useInfoClient } from '../client/useInfoClient';
import type { Market } from './types';
import { useMarketsStore, loadFavoritesFromStorage } from './useMarketsStore';

// AsyncStorage keys for market cache
const MARKETS_CACHE_KEY = '@riverrun:markets_cache';
const CACHE_EXPIRY_KEY = '@riverrun:markets_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseMarketDataResult {
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
  /** Manually refresh markets data */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage market data from Hyperliquid API
 * Handles caching, loading favorites, and updating the markets store
 *
 * This hook should be used once at the app level to initialize market data
 */
export function useMarketData(): UseMarketDataResult {
  const infoClient = useInfoClient();
  const { setMarkets, setFavorites } = useMarketsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Fetch markets from Hyperliquid API
   */
  const fetchMarkets = useCallback(
    async (silent = false): Promise<Market[]> => {
      try {
        if (!silent) {
          setIsLoading(true);
          setError(undefined);
        }

        // Fetch from Hyperliquid API
        const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();

        // Map to Market type
        const markets: Market[] = meta.universe.map((asset: any, index: number) => {
          const assetName = asset.name;
          const ctx = assetCtxs[index];

          const currentPrice = parseFloat(ctx.markPx);
          const prevDayPrice = parseFloat(ctx.prevDayPx);
          const priceChange =
            prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;
          const fundingRate = parseFloat(ctx.funding) * 100;
          const volume = parseFloat(ctx.dayNtlVlm || '0');
          const marketId = `${assetName}-USD`;

          return {
            id: marketId,
            name: marketId,
            price: currentPrice,
            change: priceChange,
            maxLeverage: asset.maxLeverage || 1,
            fundingRate,
            volume,
            szDecimals: asset.szDecimals || 0,
          };
        });

        return markets;
      } catch (err) {
        console.error('Error fetching markets from API:', err);
        throw err instanceof Error ? err : new Error('Failed to fetch markets');
      }
    },
    [infoClient],
  );

  /**
   * Load cached markets from AsyncStorage
   */
  const loadCachedMarkets = useCallback(async (): Promise<Market[] | null> => {
    try {
      const [cachedMarketsJson, expiryTime] = await Promise.all([
        AsyncStorage.getItem(MARKETS_CACHE_KEY),
        AsyncStorage.getItem(CACHE_EXPIRY_KEY),
      ]);

      if (!cachedMarketsJson || !expiryTime) {
        return null;
      }

      const now = Date.now();
      const cachedTime = parseInt(expiryTime, 10);

      // Check if cache is still valid
      if (now - cachedTime > CACHE_DURATION) {
        return null;
      }

      return JSON.parse(cachedMarketsJson);
    } catch (error) {
      console.error('Error loading cached markets:', error);
      return null;
    }
  }, []);

  /**
   * Save markets to AsyncStorage cache
   */
  const cacheMarkets = useCallback(async (markets: Market[]): Promise<void> => {
    try {
      const now = Date.now();
      await Promise.all([
        AsyncStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(markets)),
        AsyncStorage.setItem(CACHE_EXPIRY_KEY, now.toString()),
      ]);
    } catch (error) {
      console.error('Error caching markets:', error);
    }
  }, []);

  /**
   * Refresh markets data (called by pull-to-refresh)
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const markets = await fetchMarkets(false);
      setMarkets(markets);
      await cacheMarkets(markets);

      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh markets');
      setError(error);
      setIsLoading(false);
    }
  }, [fetchMarkets, setMarkets, cacheMarkets]);

  /**
   * Initialize market data on mount
   */
  useEffect(() => {
    if (isInitialized) {
      return;
    }

    const initialize = async () => {
      try {
        // Load favorites and cached markets in parallel
        const [favorites, cachedMarkets] = await Promise.all([
          loadFavoritesFromStorage(),
          loadCachedMarkets(),
        ]);

        // Update favorites immediately
        setFavorites(favorites);

        // If we have valid cache, use it and update in background
        if (cachedMarkets && cachedMarkets.length > 0) {
          setMarkets(cachedMarkets);
          setIsLoading(false);
          setIsInitialized(true);

          // Fetch fresh data silently in background
          try {
            const freshMarkets = await fetchMarkets(true);
            setMarkets(freshMarkets);
            await cacheMarkets(freshMarkets);
          } catch (err) {
            console.error('Background refresh failed:', err);
          }
        } else {
          // No cache - fetch from API with loading state
          const markets = await fetchMarkets(false);
          setMarkets(markets);
          await cacheMarkets(markets);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Error initializing market data:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initialize();
  }, [isInitialized, fetchMarkets, loadCachedMarkets, cacheMarkets, setMarkets, setFavorites]);

  return {
    isLoading,
    error,
    refresh,
  };
}

/**
 * Clear all market data cache from AsyncStorage
 */
export async function clearMarketCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(MARKETS_CACHE_KEY),
      AsyncStorage.removeItem(CACHE_EXPIRY_KEY),
    ]);
  } catch (error) {
    console.error('Error clearing market cache:', error);
  }
}
