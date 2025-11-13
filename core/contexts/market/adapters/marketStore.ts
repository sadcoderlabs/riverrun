/**
 * Market Store - State Management Adapter
 *
 * Zustand vanilla store for managing market state with persistence.
 * Uses vanilla createStore with persist middleware for AsyncStorage persistence.
 */

import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Market, SelectedMarket } from '../ports/types';

/**
 * Market state shape
 */
interface MarketState {
  /** All available markets */
  markets: Market[];
  /** Currently selected market */
  selectedMarket: SelectedMarket | undefined;
  /** User's favorite market coins */
  favorites: string[];
}

/**
 * Market state actions
 */
interface MarketStateActions {
  /** Set all markets */
  setMarkets: (markets: Market[]) => void;

  /** Update only the price fields of markets (for realtime updates) */
  updatePrices: (prices: Record<string, string>) => void;

  /** Set selected market */
  setSelectedMarket: (market: SelectedMarket | undefined) => void;

  /** Set favorites list */
  setFavorites: (favorites: string[]) => void;

  /** Toggle favorite status for a coin */
  toggleFavorite: (coin: string) => void;

  /** Clear all state (reset to initial) */
  clear: () => void;
}

/**
 * Initial state
 */
const initialState: MarketState = {
  markets: [],
  selectedMarket: undefined,
  favorites: [],
};

/**
 * Market Store
 *
 * Vanilla Zustand store for market state management with persistence.
 * Can be used both in core business logic and React components.
 *
 * Persists: markets, selectedMarket, favorites
 */
export const marketStore = createStore<MarketState & MarketStateActions>()(
  persist(
    set => ({
      ...initialState,

      setMarkets: (markets: Market[]) => set({ markets }),

      updatePrices: (prices: Record<string, string>) =>
        set(state => ({
          markets: state.markets.map(market => {
            const realtimePrice = prices[market.coin];
            if (realtimePrice) {
              const priceNum = parseFloat(realtimePrice);
              return {
                ...market,
                price: priceNum,
                markPx: realtimePrice,
              };
            }
            return market;
          }),
        })),

      setSelectedMarket: (selectedMarket: SelectedMarket | undefined) => set({ selectedMarket }),

      setFavorites: (favorites: string[]) => set({ favorites }),

      toggleFavorite: (coin: string) =>
        set(state => ({
          favorites: state.favorites.includes(coin)
            ? state.favorites.filter(id => id !== coin)
            : [...state.favorites, coin],
        })),

      clear: () => set(initialState),
    }),
    {
      name: 'market-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        markets: state.markets,
        selectedMarket: state.selectedMarket,
        favorites: state.favorites,
      }),
    },
  ),
);
