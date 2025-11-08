import { useCallback, useMemo, useState } from 'react';
import type { Market } from './types';
import { useMarketsStore } from './useMarketsStore';
import { useAllMids } from './useAllMids';

interface UseMarketSelectorParams {
  /** Whether to enable real-time price updates */
  enableRealtimePrices?: boolean;
}

interface UseMarketSelectorResult {
  /** Modal open state */
  isOpen: boolean;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: () => void;
  /** Search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** All markets from store */
  markets: Market[];
  /** Favorites list */
  favorites: string[];
  /** Filtered and sorted markets (includes real-time prices if enabled) */
  filteredMarkets: Market[];
  /** Toggle favorite status for a market */
  toggleFavorite: (marketId: string) => Promise<void>;
}

/**
 * Hook to manage market selector business logic
 * Provides state and computed data for MarketSelectorModal
 *
 * Features:
 * - Modal open/close state management
 * - Search query management
 * - Markets filtering and sorting
 * - Real-time price integration
 * - Favorites management
 *
 * @param params - Configuration options
 * @returns Market selector state and actions
 */
export function useMarketSelector({
  enableRealtimePrices = true,
}: UseMarketSelectorParams = {}): UseMarketSelectorResult {
  const { markets, favorites, toggleFavorite } = useMarketsStore();

  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time prices (only when modal is open)
  const { data: allMidsData } = useAllMids({ enabled: isOpen && enableRealtimePrices });

  // Open modal
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close modal and reset search
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  /**
   * Compute filtered and sorted markets with real-time prices
   */
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];

    // Merge real-time prices into markets if enabled
    const marketsWithRealtimePrices = enableRealtimePrices
      ? markets.map(market => {
          // Extract coin symbol from market ID (e.g., "BTC-USD" -> "BTC")
          const coinSymbol = market.id.replace('-USD', '').replace('/USDC', '').split('/')[0];

          // Get real-time mid price if available
          const realtimeMidPrice = allMidsData?.mids[coinSymbol];

          // If we have real-time price, update the market data
          if (realtimeMidPrice) {
            const currentPrice = parseFloat(realtimeMidPrice);
            const prevDayPrice = market.price / (1 + market.change / 100); // Calculate prev day price from stored change
            const priceChange =
              prevDayPrice > 0
                ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100
                : market.change;

            return {
              ...market,
              price: currentPrice,
              change: priceChange,
            };
          }

          return market;
        })
      : markets;

    // Sort by favorites first, then volume
    const sorted = [...marketsWithRealtimePrices].sort((a, b) => {
      const aIsFavorite = favorites.includes(a.id);
      const bIsFavorite = favorites.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return b.volume - a.volume;
    });

    // Filter by search query
    if (!searchQuery) return sorted;

    const query = searchQuery.toLowerCase();

    // Separate exact matches (starts with) from partial matches (includes)
    const startsWithMatches = sorted.filter(
      m => m.id.toLowerCase().startsWith(query) || m.name.toLowerCase().startsWith(query),
    );
    const includesMatches = sorted.filter(
      m =>
        !m.id.toLowerCase().startsWith(query) &&
        !m.name.toLowerCase().startsWith(query) &&
        (m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)),
    );

    return [...startsWithMatches, ...includesMatches];
  }, [markets, favorites, searchQuery, allMidsData, enableRealtimePrices]);

  return {
    isOpen,
    open,
    close,
    searchQuery,
    setSearchQuery,
    markets,
    favorites,
    filteredMarkets,
    toggleFavorite,
  };
}
