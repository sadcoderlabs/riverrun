import { useScreenTracking } from '@/app-internal';
import { AccountEquity } from '@/app-internal/components/home/AccountEquity';
import { PerpsOverview } from '@/app-internal/components/home/PerpsOverview';
import { WalletInfo } from '@/app-internal/components/home/WalletInfo';
import { ScrollView, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with wallet info, account equity, and perps overview
 * Safe area is handled by parent layout
 */
export default function Index() {
  useScreenTracking('Home');

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Wallet Info - Sticky at top */}
      <WalletInfo />

      {/* Scrollable Content */}
      <ScrollView flex={1} backgroundColor="$gray3" contentContainerStyle={{ paddingBottom: 20 }}>
        <YStack padding="$4" gap="$4" backgroundColor="$gray3">
          <AccountEquity />
          <PerpsOverview />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
