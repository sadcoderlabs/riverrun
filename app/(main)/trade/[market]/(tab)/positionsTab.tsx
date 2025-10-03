import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';
type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

export default function PositionsTab() {
  const { address, isConnected } = useAppKitAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const infoClientRef = useRef<hl.InfoClient | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!address || !isConnected) {
        setPositions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (infoClientRef.current === null) {
          infoClientRef.current = new hl.InfoClient({ transport: new hl.HttpTransport() });
        }

        const client = infoClientRef.current;
        const clearinghouseState = await client.clearinghouseState({ user: address });

        const userPositions = clearinghouseState.assetPositions
          .filter(asset => asset.position && Number(asset.position.szi) !== 0)
          .map(asset => asset.position);

        setPositions(userPositions);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to fetch positions');
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [address, isConnected]);

  const formatNumber = (num: number | string, decimals = 2) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return !isNaN(value) ? value.toFixed(decimals) : '-';
  };

  const formatPnL = (pnl: number | string) => {
    const value = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    const formatted = formatNumber(value, 2);
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${formatted}`;
  };

  const getPositionSide = (size: number | string) => {
    const value = typeof size === 'string' ? parseFloat(size) : size;
    return value > 0 ? 'Long' : 'Short';
  };

  const getLeverageDisplay = (position: Position) => {
    const side = getPositionSide(position.szi);
    const leverage = Number(position.leverage?.value) || 1;
    return `${side} ${leverage}x`;
  };

  if (!isConnected || !address) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view positions</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading positions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">{error}</Text>
      </View>
    );
  }

  if (positions.length === 0) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open positions</Text>
      </View>
    );
  }

  return (
    <ScrollView flex={1} padding="$2">
      <YStack gap="$3">
        {positions.map((position, index) => {
          const entryPx = Number(position.entryPx);
          const unrealizedPnl = Number(position.unrealizedPnl);
          const szi = Number(position.szi);
          const currentPrice = szi !== 0 ? entryPx + unrealizedPnl / Math.abs(szi) : entryPx;
          const pnlPercentage = Number(position.returnOnEquity) * 100 || 0;

          return (
            <View
              key={`${position.coin}-${index}`}
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$2"
              padding="$3"
            >
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontWeight="bold">
                    {position.coin}
                  </Text>
                  <Text fontSize="$4" color={Number(position.szi) > 0 ? '$green10' : '$red10'}>
                    {getLeverageDisplay(position)}
                  </Text>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$color11">Unrealized P&L</Text>
                  <XStack gap="$2" alignItems="center">
                    <Text
                      fontWeight="bold"
                      color={Number(position.unrealizedPnl) >= 0 ? '$green10' : '$red10'}
                    >
                      {formatPnL(position.unrealizedPnl)}
                    </Text>
                    <Text
                      fontSize="$2"
                      color={Number(position.unrealizedPnl) >= 0 ? '$green10' : '$red10'}
                    >
                      ({pnlPercentage >= 0 ? '+' : ''}
                      {formatNumber(pnlPercentage)}%)
                    </Text>
                  </XStack>
                </XStack>

                <View height={1} backgroundColor="$borderColor" marginVertical="$1" />

                <YStack gap="$1">
                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Size
                    </Text>
                    <Text fontSize="$2">{formatNumber(Math.abs(Number(position.szi)), 4)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Entry Price
                    </Text>
                    <Text fontSize="$2">{formatNumber(position.entryPx)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Mark Price
                    </Text>
                    <Text fontSize="$2">{formatNumber(currentPrice)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Margin
                    </Text>
                    <Text fontSize="$2">${formatNumber(position.marginUsed)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Value
                    </Text>
                    <Text fontSize="$2">${formatNumber(position.positionValue)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Funding
                    </Text>
                    <Text fontSize="$2">
                      ${formatNumber(Number(position.cumFunding?.sinceOpen) || 0)}
                    </Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Liquidation Price
                    </Text>
                    <Text fontSize="$2">{formatNumber(position.liquidationPx)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$color11">
                      Mode
                    </Text>
                    <Text fontSize="$2">
                      {position.leverage?.type?.toUpperCase() || 'ISOLATED'}
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            </View>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
