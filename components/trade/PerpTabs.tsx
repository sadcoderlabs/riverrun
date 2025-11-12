import OrdersTab from '@/components/trade/OrdersTab';
import PositionsTab from '@/components/trade/PositionsTab';
import HistoryTab from '@/components/trade/HistoryTab';
import { useState, useEffect } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { useOrderCount } from '@/core/composition';
import { usePositionStore } from '@/core/contexts/position/reactNative/usePositionStore';
import { useLocalSearchParams, useRouter } from 'expo-router';

export function PerpTabs() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'orders' | 'positions' | 'history'>('orders');
  const orderCount = useOrderCount();
  const positionCount = usePositionStore(state => state.positions.length);

  // Sync activeTab with URL params
  useEffect(() => {
    if (params.tab && ['orders', 'positions', 'history'].includes(params.tab)) {
      setActiveTab(params.tab as 'orders' | 'positions' | 'history');
    }
  }, [params.tab]);

  const handleTabChange = (tab: 'orders' | 'positions' | 'history') => {
    setActiveTab(tab);
    // Update URL params without navigation
    router.setParams({ tab });
  };

  return (
    <YStack borderTopWidth={1} borderTopColor="$gray8" backgroundColor="$background">
      {/* Tab Headers */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
        <TabItem
          label="Orders"
          isActive={activeTab === 'orders'}
          onPress={() => handleTabChange('orders')}
          count={orderCount}
        />
        <TabItem
          label="Positions"
          isActive={activeTab === 'positions'}
          onPress={() => handleTabChange('positions')}
          count={positionCount}
        />
        <TabItem
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => handleTabChange('history')}
        />
      </XStack>

      {/* Tab Content - All tabs stay mounted, only visibility changes */}
      <YStack padding="$4">
        <YStack display={activeTab === 'orders' ? 'flex' : 'none'}>
          <OrdersTab />
        </YStack>

        <YStack display={activeTab === 'positions' ? 'flex' : 'none'}>
          <PositionsTab />
        </YStack>

        <YStack display={activeTab === 'history' ? 'flex' : 'none'}>
          <HistoryTab />
        </YStack>
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
          <Text fontSize="$1" fontFamily="$interSemiBold" color={isActive ? '$accent11' : '$color'}>
            {count}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}
