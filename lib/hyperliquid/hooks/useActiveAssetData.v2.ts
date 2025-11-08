/**
 * Hook to get Hyperliquid's activeAssetData using unified subscription system
 *
 * NEW VERSION (Phase 2): Uses unified subscription system
 * - Replaces custom store logic (useActiveAssetDataStore) with useSubscription
 * - Maintains same API for backward compatibility
 * - Simplifies implementation significantly (no custom store, no refCount management)
 *
 * Features:
 * - Shared subscriptions: multiple components can subscribe to same coin (ref counting handled automatically)
 * - Hybrid strategy: fast HTTP fetch + real-time WebSocket updates
 * - App Lifecycle management (pauses in background)
 * - Global rate limiting (protects Hyperliquid server)
 *
 * OLD Implementation: ~240 lines (store) + ~100 lines (hook) = 340 lines
 * NEW Implementation: ~50 lines (just this hook)
 * Code reduction: 85% 📉
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription } from '../subscription';

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
 * Hook to get Hyperliquid's activeAssetData using unified subscription system.
 *
 * MIGRATION NOTE:
 * - This replaces the old useActiveAssetData + useActiveAssetDataStore combo
 * - All RefCount, App Lifecycle, and Rate Limiting are now handled automatically
 * - Same API, much simpler implementation
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  // All complexity (RefCount, HTTP+WS, Rate Limiting, App Lifecycle) is handled automatically!
  const { data, isLoading, error } = useSubscription<ActiveAssetData>('activeAssetData', {
    user: wallet?.address,
    coin,
  });

  return {
    data,
    isLoading,
    error,
  };
}
