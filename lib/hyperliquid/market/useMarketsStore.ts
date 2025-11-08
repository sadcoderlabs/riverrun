import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Market } from './types';

// AsyncStorage key for favorites
const FAVORITES_KEY = '@riverrun:favorite_markets';

/**
 * Selected market information
 * Contains all necessary data about the currently selected trading market
 */
export interface SelectedMarket {
  /** Market coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Full market trading pair (e.g., "BTC-USD", "ETH-USD") */
  marketPair: string;
  /** Size decimals for price formatting */
  szDecimals: number;
  /** Maximum leverage available for this market */
  maxLeverage: number;
  /** Margin table ID (for future dynamic leverage calculation) */
  marginTableId?: number;
}

/**
 * Markets state management
 * Handles market list, favorites, and currently selected market
 */
interface MarketsState {
  // Market list state
  markets: Market[];
  favorites: string[];

  // Currently selected market state
  selectedMarket: SelectedMarket | null;

  // Market list actions
  setMarkets: (markets: Market[]) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (marketId: string) => Promise<void>;

  // Selected market actions
  setSelectedMarketByCoin: (coin: string) => void;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  // Initial state
  markets: [],
  favorites: [],
  selectedMarket: null,

  /**
   * Set markets data
   */
  setMarkets: (markets: Market[]) => {
    set({ markets });
  },

  /**
   * Set favorites list
   */
  setFavorites: (favorites: string[]) => {
    set({ favorites });
  },

  /**
   * Toggle favorite status for a market
   * Updates both memory and AsyncStorage
   */
  toggleFavorite: async (marketId: string) => {
    const { favorites } = get();

    // Update memory immediately for instant UI response
    const newFavorites = favorites.includes(marketId)
      ? favorites.filter(id => id !== marketId)
      : [...favorites, marketId];

    set({ favorites: newFavorites });

    // Persist to AsyncStorage in background
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error persisting favorite:', error);
      // Revert on error
      set({ favorites });
    }
  },

  /**
   * Set the currently selected market by coin symbol
   * Finds market from the markets list and updates selectedMarket
   */
  setSelectedMarketByCoin: (coin: string) => {
    const { markets } = get();
    const market = markets.find(m => m.coin === coin.toUpperCase());

    if (market) {
      set({
        selectedMarket: {
          coin: market.coin,
          marketPair: market.marketPair,
          szDecimals: market.szDecimals,
          maxLeverage: market.maxLeverage,
        },
      });
    } else {
      console.warn(`[useMarketsStore] Market not found: ${coin}`);
    }
  },
}));

/**
 * Load favorites from AsyncStorage
 * This is a utility function used by useMarketData
 */
export async function loadFavoritesFromStorage(): Promise<string[]> {
  try {
    const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
    return favoritesJson ? JSON.parse(favoritesJson) : [];
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
}

/**
 * Clear all favorites from AsyncStorage
 * This is a utility function that can be used when needed
 */
export async function clearFavoritesStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAVORITES_KEY);
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
}
