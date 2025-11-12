/**
 * useMarket - Market Business Operations Hook
 *
 * Provides business operations for market management.
 * For state access, use useMarketStore instead for better performance.
 */

import { useContext, useCallback, useState } from 'react';
import { MarketContext } from './marketComposition';

export interface UseMarketResult {
  /** UI loading state (for manual refresh) */
  isRefreshing: boolean;

  /** Business operations */
  refresh: () => Promise<void>;
  setSelectedMarketByCoin: (coin: string) => void;
  toggleFavorite: (coin: string) => void;
}

/**
 * useMarket - Market business operations hook
 *
 * For state access, use useMarketStore instead for better performance.
 *
 * @example
 * ```typescript
 * // State access - use useMarketStore
 * const markets = useMarketStore(state => state.markets);
 * const selectedMarket = useMarketStore(state => state.selectedMarket);
 *
 * // Business operations - use useMarket
 * const { refresh, setSelectedMarketByCoin, toggleFavorite, isRefreshing } = useMarket();
 *
 * // Usage
 * const handleRefresh = async () => {
 *   await refresh();
 * };
 *
 * const handleSelectMarket = (coin: string) => {
 *   setSelectedMarketByCoin(coin);
 * };
 * ```
 */
export function useMarket(): UseMarketResult {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error('useMarket must be used within MarketCompositionProvider');
  }

  const { marketService } = context;

  // UI state only (for manual refresh)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Business operations
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await marketService.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [marketService]);

  const setSelectedMarketByCoin = useCallback(
    (coin: string) => {
      marketService.setSelectedMarketByCoin(coin);
    },
    [marketService],
  );

  const toggleFavorite = useCallback(
    (coin: string) => {
      marketService.toggleFavorite(coin);
    },
    [marketService],
  );

  return {
    isRefreshing,
    refresh,
    setSelectedMarketByCoin,
    toggleFavorite,
  };
}
