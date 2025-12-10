import { useEffect, useMemo, useRef, useState } from 'react';
import type * as hl from '@nktkas/hyperliquid';
import type { AllDexsClearinghouseStateEvent } from '@nktkas/hyperliquid/api/subscription';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { subscriptionManager } from '../subscription';
import type { SubscriptionHandle } from '../subscription/types';

/**
 * Aggregated clearinghouse state across all DEXs (validator perps + HIP-3)
 */
export interface AggregatedClearinghouseState {
  /** Total account value across all DEXs */
  totalAccountValue: number;
  /** Total notional position value across all DEXs */
  totalNtlPos: number;
  /** Total raw USD across all DEXs */
  totalRawUsd: number;
  /** Total margin used across all DEXs */
  totalMarginUsed: number;
  /** Total maintenance margin used across all DEXs */
  totalMaintenanceMarginUsed: number;
  /** All positions from all DEXs, with dex name prefix */
  allPositions: AggregatedPosition[];
  /** Individual DEX states for reference */
  dexStates: DexClearinghouseState[];
}

export interface AggregatedPosition {
  /** DEX name (empty string for validator perps, e.g., "xyz" for HIP-3) */
  dex: string;
  /** Position data */
  position: hl.ClearinghouseStateResponse['assetPositions'][number]['position'];
}

export interface DexClearinghouseState {
  /** DEX name (empty string for validator perps) */
  dex: string;
  /** Raw clearinghouse state from API */
  state: hl.ClearinghouseStateResponse;
}

export interface UseMultiDexClearinghouseResult {
  data: AggregatedClearinghouseState | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Aggregate multiple clearinghouse states into a single result
 */
function aggregateClearinghouseStates(
  dexStates: DexClearinghouseState[],
): AggregatedClearinghouseState {
  let totalAccountValue = 0;
  let totalNtlPos = 0;
  let totalRawUsd = 0;
  let totalMarginUsed = 0;
  let totalMaintenanceMarginUsed = 0;
  const allPositions: AggregatedPosition[] = [];

  for (const { dex, state } of dexStates) {
    // Sum up account values from marginSummary
    totalAccountValue += parseFloat(state.marginSummary.accountValue);
    totalNtlPos += Math.abs(parseFloat(state.marginSummary.totalNtlPos));
    totalRawUsd += parseFloat(state.marginSummary.totalRawUsd);
    totalMarginUsed += parseFloat(state.marginSummary.totalMarginUsed);
    totalMaintenanceMarginUsed += parseFloat(state.crossMaintenanceMarginUsed);

    // Collect all non-zero positions
    for (const asset of state.assetPositions) {
      const szi = parseFloat(asset.position.szi);
      if (szi !== 0) {
        allPositions.push({
          dex,
          position: asset.position,
        });
      }
    }
  }

  return {
    totalAccountValue,
    totalNtlPos,
    totalRawUsd,
    totalMarginUsed,
    totalMaintenanceMarginUsed,
    allPositions,
    dexStates,
  };
}

/**
 * Convert AllDexsClearinghouseStateEvent to DexClearinghouseState array
 */
function convertEventToDexStates(event: AllDexsClearinghouseStateEvent): DexClearinghouseState[] {
  return event.clearinghouseStates.map(([dex, state]) => ({
    dex,
    state,
  }));
}

/**
 * Hook to get aggregated clearinghouse state across all DEXs
 *
 * This hook uses the `allDexsClearinghouseState` WebSocket subscription (SDK v0.29.1+)
 * which provides real-time updates for ALL DEXs in a single subscription.
 *
 * @returns Aggregated clearinghouse state with loading and error states
 */
export function useMultiDexClearinghouse(): UseMultiDexClearinghouseResult {
  const { address } = useWallet();
  const [wsData, setWsData] = useState<AllDexsClearinghouseStateEvent | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  // Use ref to store the handle, so cleanup can access it even if async subscribe hasn't completed
  const handleRef = useRef<SubscriptionHandle | undefined>(undefined);
  const isCancelledRef = useRef(false);

  // Clear data when wallet changes to prevent showing stale data from previous wallet
  useEffect(() => {
    setWsData(undefined);
    setIsLoading(true);
    setError(undefined);
  }, [address]);

  // Subscribe to allDexsClearinghouseState WebSocket
  useEffect(() => {
    if (!address) {
      setWsData(undefined);
      setIsLoading(false);
      return;
    }

    // Reset refs for new subscription
    handleRef.current = undefined;
    isCancelledRef.current = false;

    (async () => {
      try {
        const handle = await subscriptionManager.subscribe<AllDexsClearinghouseStateEvent>(
          'allDexsClearinghouseState',
          { user: address },
          data => {
            // Check if this subscription was cancelled while waiting
            if (!isCancelledRef.current) {
              setWsData(data);
              setIsLoading(false);
            }
          },
        );

        // Store handle in ref for cleanup
        handleRef.current = handle;

        // If cancelled while subscribing, immediately unsubscribe
        if (isCancelledRef.current) {
          await subscriptionManager.unsubscribe(handle);
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          console.warn('[useMultiDexClearinghouse] WebSocket subscription failed:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      // Mark as cancelled immediately
      isCancelledRef.current = true;

      // Unsubscribe if handle is available
      if (handleRef.current) {
        void subscriptionManager.unsubscribe(handleRef.current);
      }
    };
  }, [address]);

  // Convert WebSocket data to aggregated format
  const aggregatedData = useMemo(() => {
    if (!wsData) return undefined;
    const dexStates = convertEventToDexStates(wsData);
    return aggregateClearinghouseStates(dexStates);
  }, [wsData]);

  return useMemo(
    () => ({
      data: aggregatedData,
      isLoading,
      error,
    }),
    [aggregatedData, isLoading, error],
  );
}
