import { useMemo } from 'react';
import { useWebData2 } from '@/lib/hyperliquid/hooks/useWebData2';
import { useWalletContext } from '@/core/composition';

/**
 * Hook to get real-time position count from WebSocket data
 * This hook can be used independently of the PositionsTab component
 * to show position count badges in navigation tabs
 */
export function usePositionCount(): number {
  const { wallet } = useWalletContext();
  const { data: webData } = useWebData2();

  const count = useMemo(() => {
    if (!wallet || !webData?.clearinghouseState?.assetPositions) {
      return 0;
    }

    // Count only non-zero positions
    return webData.clearinghouseState.assetPositions.filter(
      asset => asset.position && Number(asset.position.szi) !== 0,
    ).length;
  }, [wallet, webData]);

  return count;
}
