import { TopBar } from '@/components/global/top-bar';
import { AccountInfo } from '@/components/home/account-info';
import { AccountValue } from '@/components/home/account-value';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View, YStack } from 'tamagui';

/**
 * Home Page
 *
 * Shows account overview with TopBar for navigation to settings
 */
export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Top Bar - Fixed */}
      <TopBar />

      {/* Spacer for TopBar height */}
      <View height={56 + insets.top} />

      {/* Scrollable Content */}
      <ScrollView flex={1} backgroundColor="$gray3" contentContainerStyle={{ paddingBottom: 20 }}>
        <YStack padding="$4" gap="$4" backgroundColor="$gray3">
          <AccountValue value={567.89} />
          <AccountInfo />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
