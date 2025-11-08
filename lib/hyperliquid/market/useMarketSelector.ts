import { useCallback, useMemo, useState } from 'react';
import type { Market } from './types';
import { useMarketsStore } from './useMarketsStore';
import { useAllMids } from './useAllMids';
import { useThrottle } from '@/lib/riverrun/hooks';

export type SortOption = 'name' | 'volume' | 'price' | 'change';
export type SortDirection = 'asc' | 'desc';

interface UseMarketSelectorParams {
  /** Whether to enable real-time price updates */
  enableRealtimePrices?: boolean;
  /** Throttle delay for real-time price updates in milliseconds (default: 100ms) */
  throttleDelay?: number;
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
  /** Current sort option */
  sortBy: SortOption;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Set sort option */
  setSortBy: (option: SortOption) => void;
  /** Toggle sort direction */
  toggleSortDirection: () => void;
}

/**
 * Hook to manage market selector business logic
 * Provides state and computed data for MarketSelectorModal
 *
 * Features:
 * - Modal open/close state management
 * - Search query management
 * - Markets filtering and sorting
 * - Real-time price integration with throttling
 * - Favorites management
 *
 * Performance optimizations:
 * - Throttles real-time price updates to reduce re-renders
 * - Only creates new market objects when prices actually change
 * - Works with React.memo in MarketListItem for optimal performance
 *
 * @param params - Configuration options
 * @returns Market selector state and actions
 */
export function useMarketSelector({
  enableRealtimePrices = true,
  throttleDelay = 100,
}: UseMarketSelectorParams = {}): UseMarketSelectorResult {
  const { markets, favorites, toggleFavorite } = useMarketsStore();

  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Real-time prices (controlled by enableRealtimePrices parameter)
  const { data: rawAllMidsData } = useAllMids({ enabled: enableRealtimePrices });

  // Throttle price updates to reduce re-render frequency
  // WebSocket may push updates every 10-50ms, throttling to 100ms reduces load
  const allMidsData = useThrottle(rawAllMidsData, throttleDelay);

  // Open modal
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close modal and reset search
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  /**
   * Compute filtered and sorted markets with real-time prices
   * Optimization: Only create new objects when price actually changes
   */
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];

    // Merge real-time prices into markets if enabled
    const marketsWithRealtimePrices = enableRealtimePrices
      ? markets.map(market => {
          // Extract coin symbol from market ID (e.g., "BTC-USD" -> "BTC")
          const coinSymbol = market.id.replace('-USD', '').replace('/USDC', '').split('/')[0];

          // Get real-time mid price if available
          const realtimeMidPriceStr = allMidsData?.mids[coinSymbol];

          // If no real-time price available, return original market object
          if (!realtimeMidPriceStr) return market;

          const realtimePrice = parseFloat(realtimeMidPriceStr);

          // Key optimization: Only create new object if price actually changed
          // This allows React.memo to skip re-render for unchanged items
          const PRICE_EPSILON = 0.0001; // Consider prices within 0.01% as unchanged
          if (Math.abs(realtimePrice - market.price) < PRICE_EPSILON) {
            return market; // Return same reference - React.memo won't re-render
          }

          // Price changed - calculate new change percentage
          const prevDayPrice = market.price / (1 + market.change / 100);
          const priceChange =
            prevDayPrice > 0
              ? ((realtimePrice - prevDayPrice) / prevDayPrice) * 100
              : market.change;

          // Create new object only when price changed
          return {
            ...market,
            price: realtimePrice,
            change: priceChange,
          };
        })
      : markets;

    // Sort markets based on user selection
    const sorted = [...marketsWithRealtimePrices].sort((a, b) => {
      // Always prioritize favorites first
      const aIsFavorite = favorites.includes(a.id);
      const bIsFavorite = favorites.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then sort by selected criterion
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change':
          comparison = a.change - b.change;
          break;
      }

      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
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
  }, [markets, favorites, searchQuery, allMidsData, enableRealtimePrices, sortBy, sortDirection]);

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
    sortBy,
    sortDirection,
    setSortBy,
    toggleSortDirection,
  };
}
