import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useInfoClient } from '../client/useInfoClient';
import { useSubscriptionClient } from '../client/useSubscriptionClient';
import { useActiveAssetDataStore } from './useActiveAssetDataStore';
import { useAppStateSubscriptionManager } from './useAppStateSubscriptionManager';

export interface ActiveAssetData {
  user: string;
  coin: string;
  leverage: {
    type: 'isolated' | 'cross';
    value: number;
    rawUsd?: string;
  };
  maxTradeSzs: [string, string];
  availableToTrade: [string, string];
  markPx: string;
}

interface UseActiveAssetDataParams {
  coin: string;
}

interface UseActiveAssetDataResult {
  data: ActiveAssetData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to get Hyperliquid's activeAssetData using shared subscription store.
 *
 * Features:
 * - Shared subscriptions: multiple components can subscribe to same coin (ref counting)
 * - Hybrid strategy: fast HTTP fetch + real-time WebSocket updates
 * - AppState lifecycle management (pauses in background)
 * - Rate limiting: prevents rapid HTTP requests
 *
 * Architecture:
 * - All subscription logic moved to useActiveAssetDataStore (Zustand)
 * - This hook is now a thin wrapper that manages subscription lifecycle
 * - Uses useShallow for optimal performance (only re-renders when needed)
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useActiveWallet();
  const infoClient = useInfoClient();
  const subscriptionClient = useSubscriptionClient();
  const subscriptionState = useAppStateSubscriptionManager();

  // Extract stable walletAddress (avoid wallet object reference changes)
  const walletAddress = wallet?.address;

  // Get subscription data from store (use useShallow to prevent unnecessary re-renders)
  const subscription = useActiveAssetDataStore(
    useShallow(state => {
      if (!walletAddress || !coin) return undefined;
      const key = `${walletAddress}-${coin}`;
      return state.subscriptions.get(key);
    }),
  );

  // Manage subscription lifecycle
  useEffect(() => {
    if (!walletAddress || !coin) return;

    const store = useActiveAssetDataStore.getState();
    const appState = subscriptionState === 'active' ? 'active' : 'suspended';

    // Subscribe (will reuse existing subscription if available)
    void store.subscribe(walletAddress, coin, appState, infoClient, subscriptionClient);

    // Cleanup on unmount or dependency change
    return () => {
      void store.unsubscribe(walletAddress, coin);
    };
  }, [walletAddress, coin, subscriptionState, infoClient, subscriptionClient]);

  // Return data from store subscription
  return useMemo(() => {
    if (!subscription) {
      return { data: undefined, isLoading: true, error: undefined };
    }
    return {
      data: subscription.data,
      isLoading: subscription.isLoading,
      error: subscription.error,
    };
  }, [subscription]);
}
