import { MainLayout } from '@/components/global/main-layout';
import { AccountInfo } from '@/components/home/account-info';
import { AccountValue } from '@/components/home/account-value';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, YStack } from 'tamagui';

export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <MainLayout noHeader={true} showTopBar={true}>
      {/* Add a spacer that's exactly the height of the TopBar */}
      <View height={insets.top + 12} />
      <YStack flex={1} padding="$4" gap="$4">
        <AccountValue value={0.0} />
        <AccountInfo />
      </YStack>
    </MainLayout>
  );
}
