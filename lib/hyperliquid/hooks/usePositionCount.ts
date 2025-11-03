import { useMemo } from 'react';
import { useWebData2 } from './useWebData2';
import { useActiveWallet } from '@/lib/riverrun/hooks';

/**
 * Hook to get real-time position count from WebSocket data
 * This hook can be used independently of the PositionsTab component
 * to show position count badges in navigation tabs
 */
export function usePositionCount(): number {
  const { isAuthenticated } = useActiveWallet();
  const { data: webData } = useWebData2();

  const count = useMemo(() => {
    if (!isAuthenticated || !webData?.clearinghouseState?.assetPositions) {
      return 0;
    }

    // Count only non-zero positions
    return webData.clearinghouseState.assetPositions.filter(
      asset => asset.position && Number(asset.position.szi) !== 0,
    ).length;
  }, [isAuthenticated, webData]);

  return count;
}
