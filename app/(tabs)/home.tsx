import { AccountEquity } from '@/components/home/AccountEquity';
import { PerpsOverview } from '@/components/home/PerpsOverview';
import { TransferFund } from '@/components/home/TransferFund';
import { WalletInfo } from '@/components/home/WalletInfo';
import { ScrollView, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with wallet info, account equity, and perps overview
 * Safe area is handled by parent layout
 */
export default function Index() {
  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Wallet Info - Sticky at top */}
      <WalletInfo />

      {/* Scrollable Content */}
      <ScrollView flex={1} backgroundColor="$gray3" contentContainerStyle={{ paddingBottom: 20 }}>
        <YStack padding="$4" gap="$4" backgroundColor="$gray3">
          <AccountEquity />
          <PerpsOverview />
          <TransferFund />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
