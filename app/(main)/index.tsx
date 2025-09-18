import { MainLayout } from '@/components/global/main-layout';
import { Text } from '@/components/global/text';
import { Link } from 'expo-router';
import { YStack } from 'tamagui';

export default function Index() {
  return (
    <MainLayout noHeader={true}>
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$4">
        <Link href="/(main)/settings" asChild>
          <Text>Settings</Text>
        </Link>
        <Link href="/(main)/account/(tab)/positions" asChild>
          <Text>Positions</Text>
        </Link>
      </YStack>
    </MainLayout>
  );
}
