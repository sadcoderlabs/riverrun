import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Market } from '@/lib/types/market';

// AsyncStorage keys
const MARKETS_CACHE_KEY = '@riverrun:markets_cache';
const CACHE_EXPIRY_KEY = '@riverrun:markets_cache_expiry';
const FAVORITES_KEY = '@riverrun:favorite_markets';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface MarketsState {
  // State
  markets: Market[];
  favorites: string[];
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  loadInitialData: () => Promise<void>;
  fetchAndCacheMarkets: (fetchFn: () => Promise<Market[]>, silent?: boolean) => Promise<void>;
  toggleFavorite: (marketId: string) => Promise<void>;
  clear: () => void;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  // Initial state
  markets: [],
  favorites: [],
  isInitialized: false,
  isLoading: false,

  /**
   * Load initial data from AsyncStorage (favorites + cached markets)
   * This should be called once when the app starts or when market-list mounts
   */
  loadInitialData: async () => {
    const { isInitialized } = get();

    // If already initialized (data in memory), skip loading
    if (isInitialized) {
      return;
    }

    try {
      // Load favorites and cached markets in parallel
      const [favoritesJson, cachedMarketsJson, expiryTime] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(MARKETS_CACHE_KEY),
        AsyncStorage.getItem(CACHE_EXPIRY_KEY),
      ]);

      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];

      // Check if cache is valid
      let cachedMarkets: Market[] | null = null;
      if (cachedMarketsJson && expiryTime) {
        const now = Date.now();
        const cachedTime = parseInt(expiryTime, 10);

        if (now - cachedTime <= CACHE_DURATION) {
          cachedMarkets = JSON.parse(cachedMarketsJson);
        }
      }

      // Update store
      set({
        favorites,
        markets: cachedMarkets || [],
        isInitialized: true,
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      set({ isInitialized: true });
    }
  },

  /**
   * Fetch fresh markets data and cache it
   * @param fetchFn - Function that fetches markets from API
   * @param silent - If true, don't show loading state
   */
  fetchAndCacheMarkets: async (fetchFn: () => Promise<Market[]>, silent = false) => {
    try {
      if (!silent) {
        set({ isLoading: true });
      }

      // Fetch from API
      const markets = await fetchFn();

      // Save to cache and update store
      const now = Date.now();
      await Promise.all([
        AsyncStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(markets)),
        AsyncStorage.setItem(CACHE_EXPIRY_KEY, now.toString()),
      ]);

      set({
        markets,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching and caching markets:', error);
      set({ isLoading: false });
      throw error;
    }
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
   * Clear all data (both memory and cache)
   */
  clear: () => {
    set({
      markets: [],
      favorites: [],
      isInitialized: false,
      isLoading: false,
    });

    // Clear AsyncStorage in background
    Promise.all([
      AsyncStorage.removeItem(MARKETS_CACHE_KEY),
      AsyncStorage.removeItem(CACHE_EXPIRY_KEY),
      AsyncStorage.removeItem(FAVORITES_KEY),
    ]).catch(error => {
      console.error('Error clearing storage:', error);
    });
  },
}));
