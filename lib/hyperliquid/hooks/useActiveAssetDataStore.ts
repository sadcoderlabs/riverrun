import * as hl from '@nktkas/hyperliquid';
import { create } from 'zustand';
import { getInfoClient, getSubscriptionClient } from '../client/getter';
import { type ActiveAssetData } from './useActiveAssetData';

/**
 * Subscription state for a single coin + user combination
 */
interface CoinSubscription {
  coin: string;
  user: string;
  data: ActiveAssetData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  subscription: hl.Subscription | null;
  refCount: number; // Number of components using this subscription
  lastHttpFetch: number; // Timestamp of last HTTP fetch
  httpFetched: boolean; // Whether HTTP fetch has completed
}

interface ActiveAssetDataStoreState {
  subscriptions: Map<string, CoinSubscription>;
  subscribe: (user: string, coin: string) => Promise<void>;
  unsubscribe: (user: string, coin: string) => Promise<void>;
}

const MIN_HTTP_FETCH_INTERVAL = 500; // 500ms minimum between HTTP fetches per coin

/**
 * Centralized store for activeAssetData subscriptions
 *
 * Features:
 * - Reference counting: multiple components can share one subscription
 * - Rate limiting: prevents rapid HTTP requests
 * - Hybrid strategy: HTTP fetch + WebSocket subscription
 */
export const useActiveAssetDataStore = create<ActiveAssetDataStoreState>((set, get) => ({
  subscriptions: new Map(),

  subscribe: async (user, coin) => {
    const key = `${user}-${coin}`;
    const state = get();
    const existing = state.subscriptions.get(key);

    // Case 1: Subscription exists - increment refCount
    if (existing) {
      const updatedSub: CoinSubscription = {
        ...existing,
        refCount: existing.refCount + 1,
      };

      set({
        subscriptions: new Map(state.subscriptions).set(key, updatedSub),
      });

      console.log(
        `[useActiveAssetDataStore] 🔄 Reusing subscription for ${coin} (refCount: ${updatedSub.refCount})`,
      );
      return;
    }

    // Case 2: Create new subscription
    console.log(`[useActiveAssetDataStore] ✨ Creating new subscription for ${coin}`);

    const newSub: CoinSubscription = {
      coin: coin.toUpperCase(),
      user,
      data: undefined,
      isLoading: true,
      error: undefined,
      subscription: null,
      refCount: 1,
      lastHttpFetch: 0,
      httpFetched: false,
    };

    // Update store immediately with loading state
    set({
      subscriptions: new Map(state.subscriptions).set(key, newSub),
    });

    // Step 1: Fast HTTP fetch for initial data (with rate limiting)
    const now = Date.now();
    const timeSinceLastFetch = now - newSub.lastHttpFetch;

    if (timeSinceLastFetch >= MIN_HTTP_FETCH_INTERVAL) {
      try {
        const startTime = Date.now();
        newSub.lastHttpFetch = now;

        const infoClient = getInfoClient();
        const httpData = await infoClient.activeAssetData({
          coin: coin.toUpperCase(),
          user,
        });

        const duration = Date.now() - startTime;

        // Update store with HTTP data
        const currentState = get();
        const currentSub = currentState.subscriptions.get(key);

        // Only log and update if subscription still exists
        // (it may have been cleaned up if app went to background during fetch)
        if (currentSub) {
          console.log(
            `[useActiveAssetDataStore] ✅ HTTP fetch for ${coin} completed in ${duration}ms`,
          );
          // Create new object to trigger re-render
          const updatedSub: CoinSubscription = {
            ...currentSub,
            data: httpData,
            isLoading: false,
            httpFetched: true,
          };

          set({
            subscriptions: new Map(currentState.subscriptions).set(key, updatedSub),
          });
        }
      } catch (err) {
        // Only log if subscription still exists
        const currentState = get();
        if (currentState.subscriptions.has(key)) {
          console.error(`[useActiveAssetDataStore] ⚠️ HTTP fetch failed for ${coin}:`, err);
        }
        // Don't set error, will try WebSocket
      }
    } else {
      console.log(
        `[useActiveAssetDataStore] ⏭️  Skipping HTTP fetch for ${coin} (${timeSinceLastFetch}ms since last fetch)`,
      );
    }

    // Step 2: Set up WebSocket subscription
    // Note: This function is only called when app is active (checked in useActiveAssetData)
    try {
      const subscriptionClient = getSubscriptionClient();
      const subscription = await subscriptionClient.activeAssetData(
        {
          coin: coin.toUpperCase(),
          user,
        },
        assetData => {
          const currentState = get();
          const currentSub = currentState.subscriptions.get(key);

          if (currentSub) {
            // Create new object to trigger re-render
            const updatedSub: CoinSubscription = {
              ...currentSub,
              data: assetData,
              // If HTTP didn't complete yet, WebSocket is the first result
              isLoading: currentSub.httpFetched ? currentSub.isLoading : false,
            };

            set({
              subscriptions: new Map(currentState.subscriptions).set(key, updatedSub),
            });
          }
        },
      );

      // Store subscription reference
      const currentState = get();
      const currentSub = currentState.subscriptions.get(key);

      if (currentSub) {
        // Create new object to trigger re-render
        const updatedSub: CoinSubscription = {
          ...currentSub,
          subscription,
        };

        set({
          subscriptions: new Map(currentState.subscriptions).set(key, updatedSub),
        });
      }
    } catch (err) {
      const currentState = get();
      const currentSub = currentState.subscriptions.get(key);

      // Only log and set error if subscription still exists
      if (currentSub) {
        console.error(`[useActiveAssetDataStore] ❌ WebSocket subscription failed for ${coin}:`, err);

        // Only set error if both HTTP and WebSocket failed
        if (!currentSub.httpFetched) {
          // Create new object to trigger re-render
          const updatedSub: CoinSubscription = {
            ...currentSub,
            error: err instanceof Error ? err : new Error('Failed to fetch data'),
            isLoading: false,
          };

          set({
            subscriptions: new Map(currentState.subscriptions).set(key, updatedSub),
          });
        }
      }
    }
  },

  unsubscribe: async (user, coin) => {
    const key = `${user}-${coin}`;

    // Get current state to check refCount and prepare for cleanup
    const currentState = get();
    const existing = currentState.subscriptions.get(key);

    if (!existing) {
      console.warn(
        `[useActiveAssetDataStore] ⚠️  Attempted to unsubscribe from non-existent subscription: ${coin}`,
      );
      return;
    }

    const newRefCount = existing.refCount - 1;

    // If still in use by other components, just update refCount
    if (newRefCount > 0) {
      const updatedSub: CoinSubscription = {
        ...existing,
        refCount: newRefCount,
      };

      set({
        subscriptions: new Map(currentState.subscriptions).set(key, updatedSub),
      });
      return;
    }

    // refCount reached 0, perform cleanup
    console.log(`[useActiveAssetDataStore] 🧹 Cleaning up subscription for ${coin}`);

    // Remove from map immediately to prevent duplicate cleanup
    const newSubscriptions = new Map(currentState.subscriptions);
    newSubscriptions.delete(key);
    set({ subscriptions: newSubscriptions });

    // Cleanup the WebSocket subscription
    if (existing.subscription) {
      try {
        await existing.subscription.unsubscribe();
      } catch (err) {
        console.error(`[useActiveAssetDataStore] ❌ Error unsubscribing from ${coin}:`, err);
      }
    }
  },
}));
