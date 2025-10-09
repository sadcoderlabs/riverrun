import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { Ban } from '@tamagui/lucide-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Separator, Spinner, Text, useTheme, View, XStack, YStack } from 'tamagui';
import { CardContainer } from '../global/card-container';
import { HistoryData, HistoryItem } from './history-item';
import { PositionItem } from './position-item';

type Tab = 'positions' | 'history';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

// Mock history data for UI rendering
export const historyData: HistoryData[] = [
  {
    id: '1',
    symbol: 'ETH-USD',
    type: 'Close',
    direction: 'Long',
    timestamp: '16 Sep 25, 11:56 PM',
    size: '0.0248',
    sizeUnit: 'ETH',
    sizeInUSDC: '0.61',
    price: '4467.9',
    fee: '0.0644',
  },
  {
    id: '2',
    symbol: 'ETH-USD',
    type: 'Open',
    direction: 'Long',
    timestamp: '16 Sep 25, 10:43 PM',
    size: '0.0248',
    sizeUnit: 'ETH',
    sizeInUSDC: '0.06',
    price: '4440.6',
    fee: '0.064',
  },
  {
    id: '3',
    symbol: 'BTC-USD',
    type: 'Open',
    direction: 'Short',
    timestamp: '15 Sep 25, 09:22 PM',
    size: '0.0015',
    sizeUnit: 'BTC',
    sizeInUSDC: '0.12',
    price: '67250.8',
    fee: '0.0842',
  },
];

export function AccountInfo() {
  const { address, isConnected } = useAppKitAccount();
  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const [expandedPositionCoin, setExpandedPositionCoin] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
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

  useEffect(() => {
    if (
      expandedPositionCoin &&
      positions.every(position => position.coin !== expandedPositionCoin)
    ) {
      setExpandedPositionCoin(null);
    }
  }, [positions, expandedPositionCoin]);

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    // Close any expanded position when switching tabs
    setExpandedPositionCoin(null);
  };

  const handlePositionToggle = (coin: string) => {
    setExpandedPositionCoin(prev => (prev === coin ? null : coin));
  };

  return (
    <CardContainer padding="$0">
      <XStack>
        <TabButton
          label="Positions"
          isActive={activeTab === 'positions'}
          onPress={() => handleTabPress('positions')}
        />
        <TabButton
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => handleTabPress('history')}
        />
      </XStack>
      <Separator />

      {activeTab === 'positions' ? (
        !isConnected || !address ? (
          <EmptyState
            iconColor={theme.color8}
            message="connect your wallet to view positions"
            minHeight={200}
          />
        ) : loading ? (
          <YStack height={200} justifyContent="center" alignItems="center" gap="$2">
            <Spinner size="large" />
            <Text color="$color9" fontFamily="$interMedium">
              Loading positions...
            </Text>
          </YStack>
        ) : error ? (
          <EmptyState iconColor="$red9" message={error} minHeight={200} textColor="$red9" />
        ) : positions.length > 0 ? (
          <View>
            {positions.map((position, index) => (
              <PositionItem
                key={`${position.coin}-${index}`}
                position={position}
                isExpanded={expandedPositionCoin === position.coin}
                onToggle={handlePositionToggle}
              />
            ))}
          </View>
        ) : (
          <EmptyState iconColor={theme.color8} message="no open positions yet" minHeight={200} />
        )
      ) : historyData.length > 0 ? (
        <View>
          {historyData.map(history => (
            <HistoryItem key={history.id} history={history} />
          ))}
        </View>
      ) : (
        <YStack
          height={200}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          bg="$background02"
        >
          <YStack alignItems="center" gap="$2">
            <Ban size={24} color={theme.color8} />
            <Text color="$color9" fontFamily="$interMedium" fontSize="$3" textAlign="center">
              no transaction history yet
            </Text>
          </YStack>
        </YStack>
      )}
    </CardContainer>
  );
}

interface EmptyStateProps {
  iconColor: string;
  message: string;
  minHeight: number;
  textColor?: string;
}

function EmptyState({ iconColor, message, minHeight, textColor = '$color9' }: EmptyStateProps) {
  return (
    <YStack
      height={minHeight}
      justifyContent="center"
      alignItems="center"
      padding="$4"
      bg="$background02"
    >
      <YStack alignItems="center" gap="$2">
        <Ban size={24} color={iconColor} />
        <Text color={textColor} fontFamily="$interMedium" fontSize="$3" textAlign="center">
          {message}
        </Text>
      </YStack>
    </YStack>
  );
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ label, isActive, onPress }: TabButtonProps) {
  return (
    <XStack
      flex={1}
      height={48}
      alignItems="center"
      justifyContent="center"
      borderBottomWidth={2}
      borderBottomColor={isActive ? '$accent9' : 'transparent'}
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
    >
      <Text
        fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
        color={isActive ? '$accent9' : '$color9'}
      >
        {label}
      </Text>
    </XStack>
  );
}
