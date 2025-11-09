import { useActiveAssetCtx } from '@/lib/hyperliquid/hooks';
import { useMemo } from 'react';

interface UseMidPriceParams {
  coin: string;
}

interface UseMidPriceResult {
  midPrice: number | undefined;
  isLoading: boolean;
}

/**
 * Hook to get the mid price for a specific coin
 *
 * The mid price is calculated from the orderbook as (best bid + best ask) / 2
 * This is the price typically shown as the "current price" in trading UIs.
 *
 * This is different from:
 * - markPx: The mark price used for margin and liquidation calculations
 * - Latest trade price: The price of the most recent trade
 *
 * Note: midPx can be null if orderbook is empty or unavailable
 *
 * @param params - { coin: string }
 * @returns { midPrice: number | undefined, isLoading: boolean }
 */
export function useMidPrice({ coin }: UseMidPriceParams): UseMidPriceResult {
  const { data: activeAssetCtx, isLoading } = useActiveAssetCtx({ coin });

  const midPrice = useMemo(() => {
    const midPx = activeAssetCtx?.ctx.midPx;
    if (!midPx) return undefined;
    return parseFloat(midPx);
  }, [activeAssetCtx?.ctx.midPx]);

  return { midPrice, isLoading };
}
