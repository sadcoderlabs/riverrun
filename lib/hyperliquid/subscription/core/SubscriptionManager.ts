import { create } from 'zustand';
import { subscriptionRegistry } from './SubscriptionRegistry';
import type { SubscriptionEntry, SubscriptionHandle } from './types';

/**
 * Centralized subscription manager state
 */
interface SubscriptionManagerState {
  /** Map of all active subscriptions, keyed by "type:key" */
  subscriptions: Map<string, SubscriptionEntry>;
}

/**
 * Zustand store for managing all subscriptions
 */
const useSubscriptionStore = create<SubscriptionManagerState>(() => ({
  subscriptions: new Map(),
}));

/**
 * Centralized Subscription Manager
 *
 * Features:
 * - Reference counting: multiple components can share one subscription
 * - App Lifecycle management: pauseAll/resumeAll for background/foreground
 * - Hybrid strategy: HTTP fetch + WebSocket subscription
 * - Weight-based rate limiting: respects Hyperliquid's 1200 weight/minute limit
 * - Priority queue: guarantees CRITICAL requests (initial fetches) execute
 *
 * Architecture:
 * - All subscription state stored in Zustand store
 * - Subscriptions identified by "type:key" (e.g., "activeAssetData:0x123-ETH")
 * - RefCount tracks how many components are using each subscription
 * - When refCount reaches 0, subscription is cleaned up
 * - Weight-based rate limiting: each endpoint has specific weight (2, 20, or 60)
 * - Initial HTTP fetches use CRITICAL priority to guarantee execution
 */
class SubscriptionManager {
  /**
   * Subscribe to a data feed
   *
   * @param type - Subscription type (must be registered in registry)
   * @param params - Parameters for the subscription
   * @param callback - Callback to receive data updates
   * @returns Handle for unsubscribing
   */
  async subscribe<TData = any>(
    type: string,
    params: any,
    callback: (data: TData) => void,
  ): Promise<SubscriptionHandle> {
    // Get configuration from registry
    const config = subscriptionRegistry.getConfig(type);
    if (!config) {
      throw new Error(`[SubscriptionManager] Subscription type "${type}" not registered`);
    }

    // Generate unique key for this subscription
    const key = config.getKey(params);
    const storeKey = `${type}:${key}`;

    const state = useSubscriptionStore.getState();
    const existing = state.subscriptions.get(storeKey);

    // Case 1: Subscription exists - increment refCount and add callback
    if (existing) {
      const updatedEntry: SubscriptionEntry<TData> = {
        ...existing,
        refCount: existing.refCount + 1,
      };

      // Add this callback to receive data updates
      if (existing.callback) {
        const oldCallback = existing.callback;
        updatedEntry.callback = (data: TData) => {
          oldCallback(data);
          callback(data);
        };
      } else {
        updatedEntry.callback = callback;
      }

      // Update store
      useSubscriptionStore.setState(prevState => ({
        subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
      }));

      console.log(
        `[SubscriptionManager] 🔄 Reusing subscription for ${type}:${key} (refCount: ${updatedEntry.refCount})`,
      );

      // If data is already available, call callback immediately
      if (existing.data !== undefined) {
        callback(existing.data);
      }

      return { type, key };
    }

    // Case 2: Create new subscription
    console.log(`[SubscriptionManager] ✨ Creating new subscription for ${type}:${key}`);

    const newEntry: SubscriptionEntry<TData> = {
      type,
      key,
      refCount: 1,
      data: undefined,
      isLoading: true,
      error: undefined,
      subscription: null,
      isPaused: false,
      params,
      callback,
    };

    // Update store immediately with loading state
    useSubscriptionStore.setState(prevState => ({
      subscriptions: new Map(prevState.subscriptions).set(storeKey, newEntry),
    }));

    // Set up WebSocket subscription
    try {
      const subscription = await config.subscribe(params, (data: TData) => {
        const currentState = useSubscriptionStore.getState();
        const currentEntry = currentState.subscriptions.get(storeKey);

        if (currentEntry) {
          const updatedEntry: SubscriptionEntry<TData> = {
            ...currentEntry,
            data,
            isLoading: false,
          };

          useSubscriptionStore.setState(prevState => ({
            subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
          }));

          // Call all callbacks
          if (currentEntry.callback) {
            currentEntry.callback(data);
          }
        }
      });

      // Store subscription reference
      const currentState = useSubscriptionStore.getState();
      const currentEntry = currentState.subscriptions.get(storeKey);

      if (currentEntry) {
        const updatedEntry: SubscriptionEntry<TData> = {
          ...currentEntry,
          subscription,
        };

        useSubscriptionStore.setState(prevState => ({
          subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
        }));
      }
    } catch (err) {
      const currentState = useSubscriptionStore.getState();
      const currentEntry = currentState.subscriptions.get(storeKey);

      // Only log and set error if subscription still exists
      if (currentEntry) {
        console.error(
          `[SubscriptionManager] ❌ WebSocket subscription failed for ${type}:${key}:`,
          err,
        );

        const updatedEntry: SubscriptionEntry<TData> = {
          ...currentEntry,
          error: err instanceof Error ? err : new Error('Failed to fetch data'),
          isLoading: false,
        };

        useSubscriptionStore.setState(prevState => ({
          subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
        }));
      }
    }

    return { type, key };
  }

  /**
   * Unsubscribe from a data feed
   *
   * Decrements refCount. When refCount reaches 0, cleans up the subscription.
   *
   * @param handle - Handle returned by subscribe()
   */
  async unsubscribe(handle: SubscriptionHandle): Promise<void> {
    const { type, key } = handle;
    const storeKey = `${type}:${key}`;

    const currentState = useSubscriptionStore.getState();
    const existing = currentState.subscriptions.get(storeKey);

    if (!existing) {
      console.warn(
        `[SubscriptionManager] ⚠️  Attempted to unsubscribe from non-existent subscription: ${storeKey}`,
      );
      return;
    }

    const newRefCount = existing.refCount - 1;

    // If still in use by other components, just update refCount
    if (newRefCount > 0) {
      const updatedEntry: SubscriptionEntry = {
        ...existing,
        refCount: newRefCount,
      };

      useSubscriptionStore.setState(prevState => ({
        subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
      }));

      console.log(
        `[SubscriptionManager] 📉 Decremented refCount for ${storeKey} (refCount: ${newRefCount})`,
      );
      return;
    }

    // refCount reached 0, perform cleanup
    console.log(`[SubscriptionManager] 🧹 Cleaning up subscription for ${storeKey}`);

    // Remove from map immediately to prevent duplicate cleanup
    const newSubscriptions = new Map(currentState.subscriptions);
    newSubscriptions.delete(storeKey);
    useSubscriptionStore.setState({ subscriptions: newSubscriptions });

    // Cleanup the WebSocket subscription
    if (existing.subscription) {
      try {
        await existing.subscription.unsubscribe();
      } catch (err) {
        console.error(`[SubscriptionManager] ❌ Error unsubscribing from ${storeKey}:`, err);
      }
    }
  }

  /**
   * Pause all active subscriptions (called when app goes to background)
   *
   * Unsubscribes from all WebSockets but keeps state and refCounts.
   * Subscriptions can be resumed later with resumeAll().
   */
  async pauseAll(): Promise<void> {
    console.log('[SubscriptionManager] ⏸️  Pausing all subscriptions');

    const state = useSubscriptionStore.getState();
    const updates = new Map<string, SubscriptionEntry>();

    // Unsubscribe from all WebSockets
    for (const [storeKey, entry] of state.subscriptions.entries()) {
      if (entry.subscription && !entry.isPaused) {
        try {
          await entry.subscription.unsubscribe();
          console.log(`[SubscriptionManager] ⏸️  Paused ${storeKey}`);
        } catch (err) {
          console.error(`[SubscriptionManager] ❌ Error pausing ${storeKey}:`, err);
        }

        // Mark as paused, clear subscription reference
        updates.set(storeKey, {
          ...entry,
          subscription: null,
          isPaused: true,
        });
      }
    }

    // Update all paused subscriptions
    if (updates.size > 0) {
      useSubscriptionStore.setState(prevState => {
        const newSubscriptions = new Map(prevState.subscriptions);
        for (const [storeKey, updatedEntry] of updates.entries()) {
          newSubscriptions.set(storeKey, updatedEntry);
        }
        return { subscriptions: newSubscriptions };
      });
    }
  }

  /**
   * Resume all paused subscriptions (called when app comes to foreground)
   *
   * Resubscribes to all paused subscriptions using stored params and callbacks.
   */
  async resumeAll(): Promise<void> {
    console.log('[SubscriptionManager] ▶️  Resuming all subscriptions');

    const state = useSubscriptionStore.getState();

    for (const [storeKey, entry] of state.subscriptions.entries()) {
      if (entry.isPaused) {
        const config = subscriptionRegistry.getConfig(entry.type);
        if (!config) {
          console.error(`[SubscriptionManager] Cannot resume ${storeKey}: config not found`);
          continue;
        }

        try {
          // Resubscribe to WebSocket
          const subscription = await config.subscribe(entry.params, (data: any) => {
            const currentState = useSubscriptionStore.getState();
            const currentEntry = currentState.subscriptions.get(storeKey);

            if (currentEntry) {
              const updatedEntry: SubscriptionEntry = {
                ...currentEntry,
                data,
                isLoading: false,
              };

              useSubscriptionStore.setState(prevState => ({
                subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
              }));

              // Call stored callback
              if (currentEntry.callback) {
                currentEntry.callback(data);
              }
            }
          });

          // Update with new subscription
          const currentState = useSubscriptionStore.getState();
          const currentEntry = currentState.subscriptions.get(storeKey);

          if (currentEntry) {
            const updatedEntry: SubscriptionEntry = {
              ...currentEntry,
              subscription,
              isPaused: false,
            };

            useSubscriptionStore.setState(prevState => ({
              subscriptions: new Map(prevState.subscriptions).set(storeKey, updatedEntry),
            }));

            console.log(`[SubscriptionManager] ▶️  Resumed ${storeKey}`);
          }
        } catch (err) {
          console.error(`[SubscriptionManager] ❌ Error resuming ${storeKey}:`, err);
        }
      }
    }
  }

  /**
   * Get current state of a subscription (for debugging/monitoring)
   */
  getSubscriptionState(type: string, key: string): SubscriptionEntry | undefined {
    const storeKey = `${type}:${key}`;
    const state = useSubscriptionStore.getState();
    return state.subscriptions.get(storeKey);
  }

  /**
   * Get all active subscriptions (for debugging/monitoring)
   */
  getAllSubscriptions(): Map<string, SubscriptionEntry> {
    return useSubscriptionStore.getState().subscriptions;
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

// Also export the store hook for components that need to observe state
export { useSubscriptionStore };
