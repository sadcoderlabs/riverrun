import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Market } from './types';
import { getInfoClient } from '../client/getter';

// AsyncStorage keys
const FAVORITES_KEY = '@riverrun:favorite_markets';
const MARKETS_CACHE_KEY = '@riverrun:markets_cache';
const CACHE_EXPIRY_KEY = '@riverrun:markets_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  selectedMarket: SelectedMarket | null;
  isLoading: boolean;
  error: Error | undefined;
  isInitialized: boolean;

  // Market list actions
  setMarkets: (markets: Market[]) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (marketId: string) => Promise<void>;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  // Selected market actions
  setSelectedMarketByCoin: (coin: string) => void;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  // Initial state
  markets: [],
  favorites: [],
  selectedMarket: null,
  isLoading: false,
  error: undefined,
  isInitialized: false,

  /**
   * Set markets data
   * Automatically sets selectedMarket to BTC if it's currently null
   */
  setMarkets: (markets: Market[]) => {
    const { selectedMarket } = get();
    set({ markets });

    // Auto-select BTC as default market on first load
    if (!selectedMarket && markets.length > 0) {
      const btcMarket = markets.find(m => m.coin === 'BTC');
      if (btcMarket) {
        set({
          selectedMarket: {
            coin: btcMarket.coin,
            marketPair: btcMarket.marketPair,
            szDecimals: btcMarket.szDecimals,
            maxLeverage: btcMarket.maxLeverage,
          },
        });
      }
    }
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
   * Initialize market data from cache and API
   * Loads cached data first for instant display, then fetches fresh data in background
   */
  initialize: async () => {
    const { isInitialized } = get();
    if (isInitialized) {
      return;
    }

    try {
      // Load favorites and cached markets in parallel
      const [favorites, cachedMarkets] = await Promise.all([
        loadFavoritesFromStorage(),
        loadCachedMarkets(),
      ]);

      // Update favorites immediately
      get().setFavorites(favorites);

      // If we have valid cache, use it and update in background
      if (cachedMarkets && cachedMarkets.length > 0) {
        get().setMarkets(cachedMarkets);
        set({ isInitialized: true });

        // Fetch fresh data silently in background
        try {
          await get().refresh();
        } catch (err) {
          console.error('Background refresh failed:', err);
        }
      } else {
        // No cache - fetch from API with loading state
        await get().refresh();
        set({ isInitialized: true });
      }
    } catch (err) {
      console.error('Error initializing market data:', err);
      set({ isInitialized: true });
    }
  },

  /**
   * Refresh markets data from Hyperliquid API
   * Used for manual refresh (pull-to-refresh)
   */
  refresh: async () => {
    try {
      set({ isLoading: true, error: undefined });

      // Get infoClient internally
      const infoClient = getInfoClient();
      const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();

      const markets: Market[] = meta.universe.map((asset: any, index: number) => {
        const assetName = asset.name;
        const ctx = assetCtxs[index];

        const currentPrice = parseFloat(ctx.markPx);
        const prevDayPrice = parseFloat(ctx.prevDayPx);
        const priceChange =
          prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;
        const fundingRate = parseFloat(ctx.funding) * 100;
        const volume = parseFloat(ctx.dayNtlVlm || '0');
        const marketPair = `${assetName}-USD`;

        return {
          marketPair,
          coin: assetName,
          price: currentPrice,
          change: priceChange,
          maxLeverage: asset.maxLeverage || 1,
          fundingRate,
          volume,
          szDecimals: asset.szDecimals || 0,
        };
      });

      // Update markets and cache
      get().setMarkets(markets);
      await cacheMarkets(markets);

      set({ isLoading: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch markets');
      set({ error, isLoading: false });
      throw error;
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
 * Cache markets to AsyncStorage
 */
async function cacheMarkets(markets: Market[]): Promise<void> {
  try {
    const now = Date.now();
    await Promise.all([
      AsyncStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(markets)),
      AsyncStorage.setItem(CACHE_EXPIRY_KEY, now.toString()),
    ]);
  } catch (error) {
    console.error('Error caching markets:', error);
  }
}

/**
 * Load cached markets from AsyncStorage
 */
export async function loadCachedMarkets(): Promise<Market[] | null> {
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
}

/**
 * Load favorites from AsyncStorage
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
 * Clear all caches from AsyncStorage
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(FAVORITES_KEY),
      AsyncStorage.removeItem(MARKETS_CACHE_KEY),
      AsyncStorage.removeItem(CACHE_EXPIRY_KEY),
    ]);
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}
