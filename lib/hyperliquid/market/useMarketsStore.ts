import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Market } from './types';
import * as infoClient from '../client/infoClient';

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
  // Data state
  markets: Market[];
  favorites: string[];
  selectedMarket: SelectedMarket | undefined;

  // Actions
  refresh: () => Promise<void>;
  toggleFavorite: (marketId: string) => void;
  setSelectedMarketByCoin: (coin: string) => void;

  // Internal helpers (not for external use)
  setMarkets: (markets: Market[]) => void;
  setFavorites: (favorites: string[]) => void;
}

export const useMarketsStore = create<MarketsState>()(
  persist(
    (set, get) => ({
      // Initial state
      markets: [],
      favorites: [],
      selectedMarket: undefined,

      /**
       * Set markets data
       * Automatically sets selectedMarket to BTC if it's currently undefined
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
       * Updates favorites list (auto-persisted by Zustand)
       */
      toggleFavorite: (marketId: string) => {
        const { favorites } = get();

        // Update favorites (will be auto-persisted by Zustand)
        const newFavorites = favorites.includes(marketId)
          ? favorites.filter(id => id !== marketId)
          : [...favorites, marketId];

        set({ favorites: newFavorites });
      },

      /**
       * Refresh markets data from Hyperliquid API
       * Uses rate limiter to prevent 429 errors
       */
      refresh: async () => {
        // Fetch meta and asset contexts
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
            assetId: index, // Asset ID is the index in meta.universe array
            price: currentPrice,
            change: priceChange,
            maxLeverage: asset.maxLeverage || 1,
            fundingRate,
            volume,
            szDecimals: asset.szDecimals || 0,
          };
        });

        // Update markets (auto-persisted by Zustand)
        get().setMarkets(markets);
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
    }),
    {
      name: 'markets-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        markets: state.markets,
        selectedMarket: state.selectedMarket,
        favorites: state.favorites,
      }),
    },
  ),
);
