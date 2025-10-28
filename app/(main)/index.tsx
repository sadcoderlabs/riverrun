import { AccountValue } from '@/components/home/account-value';
import { WalletInfo } from '@/components/home/wallet-info';
import { ScrollView, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with wallet info and account value
 */
export default function Index() {
  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Wallet Info - Sticky at top */}
      <WalletInfo />

      {/* Scrollable Content */}
      <ScrollView flex={1} backgroundColor="$gray3" contentContainerStyle={{ paddingBottom: 20 }}>
        <YStack padding="$4" gap="$4" backgroundColor="$gray3">
          <AccountValue value={567.89} />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
