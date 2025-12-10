import { useScreenTracking, useWallet } from '@/app-internal';
import { AccountEquity } from '@/app-internal/components/home/AccountEquity';
import { PerpsOverview } from '@/app-internal/components/home/PerpsOverview';
import { WalletInfo } from '@/app-internal/components/home/WalletInfo';
import { queryClient } from '@/infra/reactQuery';
import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with wallet info, account equity, and perps overview
 * Safe area is handled by parent layout
 */
export default function Index() {
  useScreenTracking('Home');
  const { wallet } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!wallet?.address) return;
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['webData2', wallet.address] });
    setRefreshing(false);
  }, [wallet?.address]);

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Wallet Info - Sticky at top */}
      <WalletInfo />

      {/* Scrollable Content */}
      <ScrollView
        flex={1}
        backgroundColor="$gray3"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <YStack padding="$4" gap="$4" backgroundColor="$gray3">
          <AccountEquity />
          <PerpsOverview />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
