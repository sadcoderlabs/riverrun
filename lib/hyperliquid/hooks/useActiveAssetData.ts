import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription, type ActiveAssetData } from '../subscription';
import { useMemo } from 'react';

interface UseActiveAssetDataParams {
  coin: string;
}

interface UseActiveAssetDataResult {
  data: ActiveAssetData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to get Hyperliquid's activeAssetData using unified subscription system
 *
 * Features:
 * - Reference counting: multiple components share one subscription per coin
 * - Global rate limiting: prevents 429 errors
 * - Hybrid strategy: fast HTTP fetch + real-time WebSocket updates
 * - App lifecycle management: automatic pause/resume
 *
 * @param params - { coin: string }
 * @returns Subscription state with activeAssetData
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<ActiveAssetData>(
    'activeAssetData',
    wallet ? { user: wallet.address, coin } : undefined,
  );

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
    }),
    [data, isLoading, error],
  );
}
