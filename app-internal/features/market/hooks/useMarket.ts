/**
 * useMarket - Market Business Operations Hook
 *
 * Provides business operations for market management.
 * For state access, use useMarketStore instead for better performance.
 *
 * Includes telemetry tracking for market selection and favorites.
 */

import { useCallback, useState } from 'react';
import { useContainer } from '@/app-internal/di';
import { marketStore } from '@/contexts/market/adapters/marketStore';

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
  // Get services from DI container
  const marketService = useContainer(c => c.marketService);
  const telemetryService = useContainer(c => c.telemetryService);

  // UI state only (for manual refresh)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Business operations
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await marketService.loadMarkets();
    } finally {
      setIsRefreshing(false);
    }
  }, [marketService]);

  const setSelectedMarketByCoin = useCallback(
    (coin: string) => {
      // Get current market before switching
      const fromMarket = marketStore.getState().selectedMarket?.coin;

      marketService.setSelectedMarketByCoin(coin);

      // Track market selection
      telemetryService.trackEvent('market_selected', {
        market: coin,
        fromMarket,
      });
    },
    [marketService, telemetryService],
  );

  const toggleFavorite = useCallback(
    (coin: string) => {
      // Get current favorite status before toggling
      const favorites = marketStore.getState().favorites;
      const isFavorite = !favorites.includes(coin);

      marketService.toggleFavorite(coin);

      // Track favorite toggle
      telemetryService.trackEvent('market_favorited', {
        market: coin,
        isFavorite,
      });
    },
    [marketService, telemetryService],
  );

  return {
    isRefreshing,
    refresh,
    setSelectedMarketByCoin,
    toggleFavorite,
  };
}
