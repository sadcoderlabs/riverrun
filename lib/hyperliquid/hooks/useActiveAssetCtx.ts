import { useSubscription } from '../subscription';
import type { ActiveAssetCtxData } from '../subscription/types';

export interface ActiveAssetCtx {
  coin: string;
  ctx: {
    markPx: string;
    funding: string;
    prevDayPx: string;
    dayNtlVlm: string;
    openInterest: string;
    midPx: string | null;
    oraclePx: string;
    premium: string | null;
    impactPxs: string[] | null;
    dayBaseVlm: string;
  };
}

interface UseActiveAssetCtxParams {
  coin: string;
}

interface UseActiveAssetCtxResult {
  data: ActiveAssetCtx | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's activeAssetCtx WebSocket feed
 * for real-time market data including price, funding rate, and volume.
 *
 * Uses the unified subscription system for automatic lifecycle management.
 */
export function useActiveAssetCtx({ coin }: UseActiveAssetCtxParams): UseActiveAssetCtxResult {
  // Use unified subscription system
  const { data, isLoading, error } = useSubscription<ActiveAssetCtxData>('activeAssetCtx', {
    coin,
  });

  return {
    data,
    isLoading,
    error,
  };
}
