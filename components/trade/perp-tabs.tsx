import OrdersTab from '@/components/trade/orders-tab';
import PositionsTab from '@/components/trade/positions-tab';
import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { usePositionCount } from '@/lib/hyperliquid/hooks';

export function PerpTabs() {
  const [activeTab, setActiveTab] = useState<'orders' | 'positions' | 'history'>('orders');
  const positionCount = usePositionCount();

  return (
    <YStack borderTopWidth={1} borderTopColor="$gray8" backgroundColor="$background">
      {/* Tab Headers */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
        <TabItem
          label="Orders"
          isActive={activeTab === 'orders'}
          onPress={() => setActiveTab('orders')}
        />
        <TabItem
          label="Positions"
          isActive={activeTab === 'positions'}
          onPress={() => setActiveTab('positions')}
          count={positionCount}
        />
        <TabItem
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
        />
      </XStack>

      {/* Tab Content */}
      <YStack minHeight={120} padding="$4">
        {activeTab === 'orders' && <OrdersTab />}

        {activeTab === 'positions' && (
          <YStack flex={1}>
            <PositionsTab />
          </YStack>
        )}

        {activeTab === 'history' && (
          <TabPlaceholder title="History" message="Your trading history will appear here" />
        )}
      </YStack>
    </YStack>
  );
}

// Tab Item Component
interface TabItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
}

function TabItem({ label, isActive, onPress, count }: TabItemProps) {
  return (
    <XStack
      flex={1}
      paddingVertical="$3"
      justifyContent="center"
      alignItems="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      borderBottomWidth={isActive ? 2 : 0}
      borderBottomColor={isActive ? '$accent9' : 'transparent'}
      gap="$2"
    >
      <Text
        fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
        fontSize="$3"
        color={isActive ? '$accent9' : '$color'}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <XStack
          paddingHorizontal="$2"
          paddingVertical="$0.5"
          borderRadius="$10"
          backgroundColor={isActive ? '$accent3' : '$gray8'}
          minWidth={20}
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize="$1"
            fontFamily="$interSemiBold"
            color={isActive ? '$accent11' : '$color'}
          >
            {count}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}

interface TabPlaceholderProps {
  title: string;
  message: string;
}

function TabPlaceholder({ title, message }: TabPlaceholderProps) {
  return (
    <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$2">
      <Text fontFamily="$interSemiBold" fontSize="$5" color="$color">
        {title}
      </Text>
      <Text color="$color" textAlign="center">
        {message}
      </Text>
    </YStack>
  );
}
