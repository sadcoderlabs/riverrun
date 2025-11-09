import { useActiveAssetData } from '@/lib/hyperliquid/hooks';
import { useMemo } from 'react';

interface UseMarkPriceParams {
  coin: string;
}

interface UseMarkPriceResult {
  markPrice: number;
  isLoading: boolean;
}

/**
 * Hook to get the mark price for a specific coin
 *
 * The mark price is used by Hyperliquid to calculate:
 * - Available margin to trade
 * - Position unrealized PnL
 * - Liquidation prices
 *
 * This is different from:
 * - midPx: The mid price from the orderbook (best bid + best ask) / 2
 * - Latest trade price: The price of the most recent trade
 *
 * @param params - { coin: string }
 * @returns { markPrice: number, isLoading: boolean }
 */
export function useMarkPrice({ coin }: UseMarkPriceParams): UseMarkPriceResult {
  const { data: activeAssetData, isLoading } = useActiveAssetData({ coin });

  const markPrice = useMemo(
    () => parseFloat(activeAssetData?.markPx || '0'),
    [activeAssetData?.markPx],
  );

  return { markPrice, isLoading };
}
