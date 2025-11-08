import * as hl from '@nktkas/hyperliquid';
import { create } from 'zustand';
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
  cleanupTimeout?: ReturnType<typeof setTimeout>; // Delayed cleanup timer
}

interface ActiveAssetDataStoreState {
  subscriptions: Map<string, CoinSubscription>;
  subscribe: (
    user: string,
    coin: string,
    appState: 'active' | 'suspended',
    infoClient: hl.InfoClient,
    subscriptionClient: hl.SubscriptionClient,
  ) => Promise<void>;
  unsubscribe: (user: string, coin: string) => Promise<void>;
}

const MIN_HTTP_FETCH_INTERVAL = 500; // 500ms minimum between HTTP fetches per coin
const CLEANUP_DELAY = 50; // 50ms delay before cleanup (allows reuse on quick switches)

/**
 * Centralized store for activeAssetData subscriptions
 *
 * Features:
 * - Reference counting: multiple components can share one subscription
 * - Delayed cleanup: reuses subscriptions on quick market switches
 * - Rate limiting: prevents rapid HTTP requests
 * - Hybrid strategy: HTTP fetch + WebSocket subscription
 */
export const useActiveAssetDataStore = create<ActiveAssetDataStoreState>((set, get) => ({
  subscriptions: new Map(),

  subscribe: async (user, coin, appState, infoClient, subscriptionClient) => {
    const key = `${user}-${coin}`;
    const state = get();
    const existing = state.subscriptions.get(key);

    // Case 1: Subscription exists - increment refCount and cancel cleanup
    if (existing) {
      if (existing.cleanupTimeout) {
        clearTimeout(existing.cleanupTimeout);
        console.log(`[useActiveAssetDataStore] ⏸️  Cancelled cleanup for ${coin}`);
      }

      existing.refCount++;
      existing.cleanupTimeout = undefined;

      set({
        subscriptions: new Map(state.subscriptions).set(key, existing),
      });

      console.log(
        `[useActiveAssetDataStore] 🔄 Reusing subscription for ${coin} (refCount: ${existing.refCount})`,
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
      cleanupTimeout: undefined,
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

        const httpData = await infoClient.activeAssetData({
          coin: coin.toUpperCase(),
          user,
        });

        const duration = Date.now() - startTime;
        console.log(
          `[useActiveAssetDataStore] ✅ HTTP fetch for ${coin} completed in ${duration}ms`,
        );

        // Update store with HTTP data
        const currentState = get();
        const currentSub = currentState.subscriptions.get(key);

        if (currentSub) {
          currentSub.data = httpData;
          currentSub.isLoading = false;
          currentSub.httpFetched = true;

          set({
            subscriptions: new Map(currentState.subscriptions).set(key, currentSub),
          });
        }
      } catch (err) {
        console.error(`[useActiveAssetDataStore] ⚠️ HTTP fetch failed for ${coin}:`, err);
        // Don't set error, will try WebSocket
      }
    } else {
      console.log(
        `[useActiveAssetDataStore] ⏭️  Skipping HTTP fetch for ${coin} (${timeSinceLastFetch}ms since last fetch)`,
      );
    }

    // Step 2: Set up WebSocket subscription (only if app is active)
    if (appState === 'active') {
      try {
        const subscription = await subscriptionClient.activeAssetData(
          {
            coin: coin.toUpperCase(),
            user,
          },
          assetData => {
            const currentState = get();
            const currentSub = currentState.subscriptions.get(key);

            if (currentSub) {
              currentSub.data = assetData;

              // If HTTP didn't complete yet, WebSocket is the first result
              if (!currentSub.httpFetched) {
                currentSub.isLoading = false;
              }

              set({
                subscriptions: new Map(currentState.subscriptions).set(key, currentSub),
              });
            }
          },
        );

        // Store subscription reference
        const currentState = get();
        const currentSub = currentState.subscriptions.get(key);

        if (currentSub) {
          currentSub.subscription = subscription;

          set({
            subscriptions: new Map(currentState.subscriptions).set(key, currentSub),
          });
        }
      } catch (err) {
        console.error(
          `[useActiveAssetDataStore] ❌ WebSocket subscription failed for ${coin}:`,
          err,
        );

        const currentState = get();
        const currentSub = currentState.subscriptions.get(key);

        // Only set error if both HTTP and WebSocket failed
        if (currentSub && !currentSub.httpFetched) {
          currentSub.error = err instanceof Error ? err : new Error('Failed to fetch data');
          currentSub.isLoading = false;

          set({
            subscriptions: new Map(currentState.subscriptions).set(key, currentSub),
          });
        }
      }
    }
  },

  unsubscribe: async (user, coin) => {
    const key = `${user}-${coin}`;
    const state = get();
    const existing = state.subscriptions.get(key);

    if (!existing) {
      console.warn(
        `[useActiveAssetDataStore] ⚠️  Attempted to unsubscribe from non-existent subscription: ${coin}`,
      );
      return;
    }

    // Decrement refCount
    existing.refCount--;

    // If still in use by other components, just update refCount
    if (existing.refCount > 0) {
      set({
        subscriptions: new Map(state.subscriptions).set(key, existing),
      });
      return;
    }

    // Schedule cleanup with delay (allows reuse on quick switches)
    console.log(
      `[useActiveAssetDataStore] ⏱️  Scheduling cleanup for ${coin} in ${CLEANUP_DELAY}ms`,
    );

    existing.cleanupTimeout = setTimeout(async () => {
      const currentState = get();
      const currentSub = currentState.subscriptions.get(key);

      // Double-check refCount (may have been resubscribed)
      if (!currentSub || currentSub.refCount > 0) {
        console.log(`[useActiveAssetDataStore] ⏸️  Skipping cleanup for ${coin} (resubscribed)`);
        return;
      }

      // Perform cleanup
      console.log(`[useActiveAssetDataStore] 🧹 Cleaning up subscription for ${coin}`);

      if (currentSub.subscription) {
        try {
          await currentSub.subscription.unsubscribe();
        } catch (err) {
          console.error(`[useActiveAssetDataStore] ❌ Error unsubscribing from ${coin}:`, err);
        }
      }

      // Remove from map
      const newSubscriptions = new Map(currentState.subscriptions);
      newSubscriptions.delete(key);

      set({ subscriptions: newSubscriptions });
    }, CLEANUP_DELAY);

    // Update store with cleanup timer
    set({
      subscriptions: new Map(state.subscriptions).set(key, existing),
    });
  },
}));
