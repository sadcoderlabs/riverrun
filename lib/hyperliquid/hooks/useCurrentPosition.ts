import { useMemo } from 'react';
import { useWebData2 } from './useWebData2';

interface UseCurrentPositionParams {
  coin: string;
}

// Infer position type from WebData2 response
type Position = NonNullable<
  NonNullable<ReturnType<typeof useWebData2>['data']>['clearinghouseState']
>['assetPositions'][number]['position'];

interface UseCurrentPositionResult {
  /** Current position for the specified coin, undefined if no position exists or size is zero */
  position: Position | undefined;
  /** Position size with sign (positive = long, negative = short, zero = no position) */
  size: number;
}

/**
 * Hook to get real-time position data for a specific coin
 *
 * Retrieves the current position from WebData2 feed and provides
 * convenient accessors for position details.
 *
 * @param coin - Asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 * @returns Object containing position data, direction, and size
 *
 * @example
 * ```typescript
 * const { position, size } = useCurrentPosition({ coin: 'BTC' });
 *
 * if (position) {
 *   const direction = size > 0 ? 'LONG' : 'SHORT';
 *   console.log(`Position: ${direction} ${Math.abs(size)} BTC`);
 * }
 * ```
 */
export function useCurrentPosition({ coin }: UseCurrentPositionParams): UseCurrentPositionResult {
  const { data: webData } = useWebData2();

  const result = useMemo(() => {
    if (!webData?.clearinghouseState?.assetPositions) {
      return {
        position: undefined,
        size: 0,
      };
    }

    const assetPosition = webData.clearinghouseState.assetPositions.find(
      asset => asset.position.coin === coin,
    );

    if (!assetPosition || Number(assetPosition.position.szi) === 0) {
      return {
        position: undefined,
        size: 0,
      };
    }

    const szi = Number(assetPosition.position.szi);

    return {
      position: assetPosition.position,
      size: szi, // Keep the sign (positive = long, negative = short)
    };
  }, [webData, coin]);

  return result;
}
