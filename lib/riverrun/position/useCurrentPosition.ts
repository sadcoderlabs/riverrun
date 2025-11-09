import { useMemo } from 'react';
import { useWebData2 } from '@/lib/hyperliquid/hooks/useWebData2';

interface UseCurrentPositionParams {
  coin: string;
}

/**
 * Hook to get real-time position size for a specific coin
 *
 * Returns the current position size from WebData2 feed with sign
 * indicating direction (positive = long, negative = short).
 *
 * @param coin - Asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 * @returns Position size with sign (positive = long, negative = short, zero = no position)
 *
 * @example
 * ```typescript
 * const positionSize = useCurrentPosition({ coin: 'BTC' });
 *
 * if (positionSize !== 0) {
 *   const direction = positionSize > 0 ? 'LONG' : 'SHORT';
 *   console.log(`Position: ${direction} ${Math.abs(positionSize)} BTC`);
 * }
 * ```
 */
export function useCurrentPosition({ coin }: UseCurrentPositionParams): number {
  const { data: webData } = useWebData2();

  const positionSize = useMemo(() => {
    if (!webData?.clearinghouseState?.assetPositions) {
      return 0;
    }

    const assetPosition = webData.clearinghouseState.assetPositions.find(
      asset => asset.position.coin === coin,
    );

    if (!assetPosition) {
      return 0;
    }

    return Number(assetPosition.position.szi);
  }, [webData, coin]);

  return positionSize;
}
