import AsyncStorage from '@react-native-async-storage/async-storage';
import * as hl from '@nktkas/hyperliquid';
import { create } from 'zustand';
import { Market } from '@/lib/riverrun/types/market';

// AsyncStorage keys
const MARKETS_CACHE_KEY = '@riverrun:markets_cache';
const CACHE_EXPIRY_KEY = '@riverrun:markets_cache_expiry';
const FAVORITES_KEY = '@riverrun:favorite_markets';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Hyperliquid API client (singleton)
let infoClient: hl.InfoClient | null = null;

function getInfoClient(): hl.InfoClient {
  if (!infoClient) {
    const transport = new hl.HttpTransport();
    infoClient = new hl.InfoClient({ transport });
  }
  return infoClient;
}

interface MarketsState {
  // State
  markets: Market[];
  favorites: string[];
  isInitialized: boolean;
  isLoading: boolean;
  isMarketSelectorOpen: boolean;

  // Actions
  initialize: () => Promise<void>;
  refreshMarkets: () => Promise<void>;
  toggleFavorite: (marketId: string) => Promise<void>;
  setMarketSelectorOpen: (open: boolean) => void;
  clear: () => void;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  // Initial state
  markets: [],
  favorites: [],
  isInitialized: false,
  isLoading: false,
  isMarketSelectorOpen: false,

  /**
   * Initialize the store
   * - Loads favorites and cached markets from AsyncStorage
   * - If cache exists, displays it immediately and updates in background
   * - If no cache, shows loading and fetches from API
   *
   * This should be called once when the trade page mounts
   */
  initialize: async () => {
    const { isInitialized } = get();

    // If already initialized (data in memory), skip
    if (isInitialized) {
      return;
    }

    try {
      // Load favorites and cached markets from AsyncStorage
      const [favoritesJson, cachedMarketsJson, expiryTime] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(MARKETS_CACHE_KEY),
        AsyncStorage.getItem(CACHE_EXPIRY_KEY),
      ]);

      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];

      // Check if cache is valid (not expired)
      let cachedMarkets: Market[] | null = null;
      if (cachedMarketsJson && expiryTime) {
        const now = Date.now();
        const cachedTime = parseInt(expiryTime, 10);

        if (now - cachedTime <= CACHE_DURATION) {
          cachedMarkets = JSON.parse(cachedMarketsJson);
        }
      }

      // Update favorites immediately
      set({ favorites });

      // Decide how to fetch markets based on cache
      if (cachedMarkets && cachedMarkets.length > 0) {
        // Have valid cache - show it immediately, then update in background
        set({
          markets: cachedMarkets,
          isInitialized: true,
        });

        // Fetch fresh data silently in background
        fetchFromAPI(true);
      } else {
        // No cache - show loading and fetch from API
        set({
          isInitialized: true,
          isLoading: true,
        });

        await fetchFromAPI(false);
      }
    } catch (error) {
      console.error('Error initializing markets store:', error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  /**
   * Refresh markets from API
   * Used for pull-to-refresh
   */
  refreshMarkets: async () => {
    await fetchFromAPI(false);
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
   * Set market selector modal open state
   */
  setMarketSelectorOpen: (open: boolean) => {
    set({ isMarketSelectorOpen: open });
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
      isMarketSelectorOpen: false,
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

/**
 * Internal helper: Fetch markets from Hyperliquid API and cache them
 * @param silent - If true, don't show loading state (for background refresh)
 */
async function fetchFromAPI(silent: boolean) {
  const setState = useMarketsStore.setState;

  try {
    if (!silent) {
      setState({ isLoading: true });
    }

    // Fetch from Hyperliquid API
    const client = getInfoClient();
    const [meta, assetCtxs] = await client.metaAndAssetCtxs();

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
      };
    });

    // Save to cache
    const now = Date.now();
    await Promise.all([
      AsyncStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(markets)),
      AsyncStorage.setItem(CACHE_EXPIRY_KEY, now.toString()),
    ]);

    // Update store
    setState({
      markets,
      isInitialized: true,
      isLoading: false,
    });
  } catch (error) {
    console.error('Error fetching markets from API:', error);
    setState({ isLoading: false });
    throw error;
  }
}
