import { AccountEquity } from '@/components/home/account-equity';
import { PerpsOverview } from '@/components/home/perps-overview';
import { TransferFund } from '@/components/home/transfer-fund/transfer-fund';
import { WalletInfo } from '@/components/home/wallet-info';
import { ScrollView, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with wallet info, account equity, and perps overview
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
