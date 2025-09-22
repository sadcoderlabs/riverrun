import { Ban } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Separator, Text, useTheme, View, XStack, YStack } from 'tamagui';
import { CardContainer } from '../global/card-container';
import { PositionData, PositionItem } from './position-item';

type Tab = 'positions' | 'history';

// Mock position data for UI rendering
const positionsData: PositionData[] = [
  {
    id: '1',
    symbol: 'BTC-USD',
    type: 'Long',
    leverage: '5x',
    crossMode: 'Cross',
    size: '110.13',
    sizeUnit: 'USDC',
    margin: '22.02',
    marginUnit: 'USDC',
    qty: '0.0248',
    qtyUnit: 'BTC',
    avgEntry: '4440.6',
    markPrice: '4440.9',
    liqPrice: '3618',
    pnl: '+0.01',
    pnlPercentage: '0.1%',
  },
  {
    id: '2',
    symbol: 'ETH-USD',
    type: 'Short',
    leverage: '10x',
    crossMode: 'Isolated',
    size: '500.25',
    sizeUnit: 'USDC',
    margin: '50.03',
    marginUnit: 'USDC',
    qty: '0.1245',
    qtyUnit: 'ETH',
    avgEntry: '4015.2',
    markPrice: '4040.5',
    liqPrice: '4350.8',
    pnl: '-3.15',
    pnlPercentage: '-0.63%',
  },
];

export function AccountInfo() {
  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);
  const theme = useTheme();

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    // Close any expanded position when switching tabs
    setExpandedPositionId(null);
  };

  const handlePositionToggle = (id: string) => {
    // If the position is already expanded, collapse it
    // Otherwise, expand the clicked position and collapse any other
    setExpandedPositionId(expandedPositionId === id ? null : id);
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
        positionsData.length > 0 ? (
          <View>
            {positionsData.map(position => (
              <PositionItem
                key={position.id}
                position={position}
                isExpanded={expandedPositionId === position.id}
                onToggle={handlePositionToggle}
              />
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
                no open positions yet
              </Text>
            </YStack>
          </YStack>
        )
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
