/**
 * useHistorySubscription - Manages real-time trading history subscriptions
 *
 * This hook automatically:
 * - Monitors active wallet changes
 * - Fetches historical fills via HTTP
 * - Subscribes to real-time fill updates via WebSocket
 * - Merges and deduplicates fill data
 *
 * Design: React Hook for subscription management
 * - Embraces React lifecycle (useEffect)
 * - Manages subscriptions automatically
 * - Updates historyStore directly
 */

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import { activeWalletStore } from '@/core/contexts/wallet/adapters/activeWalletStore';
import {
  HyperliquidGateway,
  type SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';
import { historyStore } from '../adapters/historyStore';
import type { Fill } from '../ports/types';

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket fill update event
 * Matches Hyperliquid SDK's WsUserFillsEvent type
 */
interface WsFillUpdate {
  user: string;
  fills: Fill[];
}

// ============================================================================
// Data Processing Functions (Testable)
// ============================================================================

/**
 * Handle WebSocket fill update
 * Merges new fills with existing fills (deduplication by tid)
 *
 * Exported for testing purposes
 */
export function handleFillUpdate(data: WsFillUpdate, currentFills: Fill[]): Fill[] {
  if (!data.fills || data.fills.length === 0) {
    return currentFills;
  }

  // Merge new fills with existing fills (deduplication by tid)
  const fillMap = new Map<number, Fill>();

  // Add existing fills
  currentFills.forEach(fill => fillMap.set(fill.tid, fill));

  // Add/update with new fills from WebSocket
  data.fills.forEach(fill => fillMap.set(fill.tid, fill));

  // Convert back to array and sort by time (most recent first)
  return Array.from(fillMap.values()).sort((a, b) => b.time - a.time);
}

// ============================================================================
// Subscription Hook
// ============================================================================

/**
 * useHistorySubscription - Automatically manages history subscriptions
 *
 * Usage:
 * ```tsx
 * export function HistoryCompositionProvider({ children }) {
 *   useHistorySubscription();  // That's it!
 *   return <HistoryContext.Provider>{children}</HistoryContext.Provider>;
 * }
 * ```
 */
export function useHistorySubscription() {
  const wallet = useStore(activeWalletStore, state => state.wallet);
  const walletAddress = wallet?.address;
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    // No wallet - clear history
    if (!walletAddress) {
      historyStore.getState().clear();
      return;
    }

    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;

    (async () => {
      try {
        historyStore.getState().setLoading(true);
        historyStore.getState().setError(undefined);

        // Step 1: HTTP fetch historical fills
        const fills = (await gateway.fetchUserFills(walletAddress)) as Fill[];

        // Check if effect was cancelled during async operation
        if (isCancelled) return;

        // Sort by time (most recent first)
        const sortedFills = fills.sort((a, b) => b.time - a.time);

        // Update store with initial data
        historyStore.getState().setFills(sortedFills);

        // Step 2: Subscribe to WebSocket for real-time updates
        subscription = await gateway.subscribeUserFills(walletAddress, (data: unknown) => {
          // Don't process if effect was cancelled
          if (!isCancelled) {
            const wsFillUpdate = data as WsFillUpdate;
            const currentFills = historyStore.getState().fills;
            const mergedFills = handleFillUpdate(wsFillUpdate, currentFills);
            historyStore.getState().setFills(mergedFills);
          }
        });

        if (!isCancelled) {
          historyStore.getState().setLoading(false);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (!isCancelled) {
          historyStore.getState().setLoading(false);
          historyStore.getState().setError(error);
        }

        console.error('[useHistorySubscription] Failed to start subscription:', error);
      }
    })();

    // Cleanup function
    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
      historyStore.getState().clear();
    };
  }, [walletAddress, gateway]);
}
