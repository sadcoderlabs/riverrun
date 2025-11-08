import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Market } from './types';

// AsyncStorage key for favorites
const FAVORITES_KEY = '@riverrun:favorite_markets';

/**
 * Pure state management for markets data
 * This store only handles state, no business logic or data fetching
 */
interface MarketsState {
  // State
  markets: Market[];
  favorites: string[];

  // Actions
  setMarkets: (markets: Market[]) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (marketId: string) => Promise<void>;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  // Initial state
  markets: [],
  favorites: [],

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
