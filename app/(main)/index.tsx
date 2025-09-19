import { MainLayout } from '@/components/global/main-layout';
import { Text } from '@/components/global/text';
import { Link } from 'expo-router';
import { YStack } from 'tamagui';

export default function Index() {
  return (
    <MainLayout noHeader={true} showTopBar={true}>
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$4">
        <Link href="/(main)/settings" asChild>
          <Text>Settings</Text>
        </Link>
        <Link href="/(main)/trade/[market]/(tab)/positions" asChild>
          <Text>View Positions(in Trade)</Text>
        </Link>
      </YStack>
    </MainLayout>
  );
}
