import { create } from 'zustand';

interface SelectedCoinState {
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
}

/**
 * Store for managing the currently selected trading coin/market.
 * Used to enable market switching without full page remount.
 */
export const useSelectedCoinStore = create<SelectedCoinState>(set => ({
  selectedCoin: 'BTC', // Default market
  setSelectedCoin: (coin: string) => set({ selectedCoin: coin.toUpperCase() }),
}));
