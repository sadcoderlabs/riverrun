/**
 * Subscription Manager
 *
 * Centralized manager for all Hyperliquid WebSocket subscriptions.
 * Pure JavaScript implementation without Zustand dependency.
 *
 * Features:
 * - Reference counting: multiple subscribers share one WebSocket connection
 * - App Lifecycle management: pauseAll/resumeAll for background/foreground
 * - Automatic cleanup: when refCount reaches 0, subscription is cleaned up
 *
 * Architecture:
 * - Uses plain JavaScript Map for state management
 * - Subscriptions identified by "type:key" (e.g., "webData2:0x123")
 * - RefCount tracks how many subscribers are using each subscription
 */

import { subscriptionRegistry } from './subscriptionRegistry';
import type { SubscriptionEntry, SubscriptionHandle } from './types';

class SubscriptionManager {
  /**
   * Internal state - Map of all active subscriptions
   * Key: "type:key" (e.g., "webData2:0x123")
   * Value: SubscriptionEntry with refCount and WebSocket reference
   */
  private subscriptions = new Map<string, SubscriptionEntry>();

  /**
   * Subscribe to a data feed
   *
   * If subscription already exists, increments refCount and adds callback.
   * If subscription doesn't exist, creates new WebSocket connection.
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

    const existing = this.subscriptions.get(storeKey);

    // Case 1: Subscription exists - increment refCount and add callback
    if (existing) {
      existing.refCount++;

      // Merge callbacks - call both old and new
      const oldCallback = existing.callback;
      existing.callback = (data: TData) => {
        oldCallback?.(data);
        callback(data);
      };

      console.log(
        `[SubscriptionManager] 🔄 Reusing subscription for ${type}:${key} (refCount: ${existing.refCount})`,
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

    // Store entry immediately
    this.subscriptions.set(storeKey, newEntry);

    // Set up WebSocket subscription
    try {
      const subscription = await config.subscribe(params, (data: TData) => {
        const entry = this.subscriptions.get(storeKey);

        if (entry) {
          entry.data = data;
          entry.isLoading = false;

          // Call all callbacks
          if (entry.callback) {
            entry.callback(data);
          }
        }
      });

      // Store subscription reference
      const entry = this.subscriptions.get(storeKey);
      if (entry) {
        entry.subscription = subscription;
      }
    } catch (err) {
      const entry = this.subscriptions.get(storeKey);

      // Only log and set error if subscription still exists
      if (entry) {
        console.error(
          `[SubscriptionManager] ❌ WebSocket subscription failed for ${type}:${key}:`,
          err,
        );

        entry.error = err instanceof Error ? err : new Error('Failed to subscribe');
        entry.isLoading = false;
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

    const entry = this.subscriptions.get(storeKey);

    if (!entry) {
      console.warn(
        `[SubscriptionManager] ⚠️  Attempted to unsubscribe from non-existent subscription: ${storeKey}`,
      );
      return;
    }

    entry.refCount--;

    // If still in use by other subscribers, just update refCount
    if (entry.refCount > 0) {
      console.log(
        `[SubscriptionManager] 📉 Decremented refCount for ${storeKey} (refCount: ${entry.refCount})`,
      );
      return;
    }

    // refCount reached 0, perform cleanup
    console.log(`[SubscriptionManager] 🧹 Cleaning up subscription for ${storeKey}`);

    // Remove from map
    this.subscriptions.delete(storeKey);

    // Cleanup the WebSocket subscription
    if (entry.subscription) {
      try {
        await entry.subscription.unsubscribe();
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

    // Unsubscribe from all WebSockets
    for (const [storeKey, entry] of this.subscriptions.entries()) {
      if (entry.subscription && !entry.isPaused) {
        try {
          await entry.subscription.unsubscribe();
          console.log(`[SubscriptionManager] ⏸️  Paused ${storeKey}`);
        } catch (err) {
          console.error(`[SubscriptionManager] ❌ Error pausing ${storeKey}:`, err);
        }

        // Mark as paused, clear subscription reference
        entry.subscription = null;
        entry.isPaused = true;
      }
    }
  }

  /**
   * Resume all paused subscriptions (called when app comes to foreground)
   *
   * Resubscribes to all paused subscriptions using stored params and callbacks.
   */
  async resumeAll(): Promise<void> {
    console.log('[SubscriptionManager] ▶️  Resuming all subscriptions');

    for (const [storeKey, entry] of this.subscriptions.entries()) {
      if (entry.isPaused) {
        const config = subscriptionRegistry.getConfig(entry.type);
        if (!config) {
          console.error(`[SubscriptionManager] Cannot resume ${storeKey}: config not found`);
          continue;
        }

        try {
          // Resubscribe to WebSocket
          const subscription = await config.subscribe(entry.params, (data: any) => {
            const currentEntry = this.subscriptions.get(storeKey);

            if (currentEntry) {
              currentEntry.data = data;
              currentEntry.isLoading = false;

              // Call stored callback
              if (currentEntry.callback) {
                currentEntry.callback(data);
              }
            }
          });

          // Update with new subscription
          const currentEntry = this.subscriptions.get(storeKey);
          if (currentEntry) {
            currentEntry.subscription = subscription;
            currentEntry.isPaused = false;

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
    return this.subscriptions.get(storeKey);
  }

  /**
   * Get all active subscriptions (for debugging/monitoring)
   */
  getAllSubscriptions(): Map<string, SubscriptionEntry> {
    return new Map(this.subscriptions);
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();
