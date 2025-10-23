import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Spinner, Text, View, YStack } from 'tamagui';
import { PositionItem } from '@/components/home/position-item';
import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

export default function PositionsTab() {
  const { address, isConnected } = useAppKitAccount();
  const { getInfoClient } = useHyperliquidClient();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

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

        const clearinghouseState = await getInfoClient().clearinghouseState({ user: address });

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

  const handleTogglePosition = useCallback((coin: string) => {
    setExpandedPositions(prev => {
      const next = new Set(prev);
      if (next.has(coin)) {
        next.delete(coin);
      } else {
        next.add(coin);
      }
      return next;
    });
  }, []);

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
    <ScrollView flex={1}>
      <YStack>
        {positions.map((position, index) => (
          <PositionItem
            key={`${position.coin}-${index}`}
            position={position}
            isExpanded={expandedPositions.has(position.coin)}
            onToggle={handleTogglePosition}
          />
        ))}
      </YStack>
    </ScrollView>
  );
}
