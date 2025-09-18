import { MainLayout } from '@/components/global/main-layout';
import { Link } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

export default function Index() {
  return (
    <MainLayout>
      <YStack flex={1} padding="$4" space="$4">
        <XStack justifyContent="space-between" alignItems="center"></XStack>
        <Link href="/(main)/settings">Settings</Link>
        <Link href="/(main)/account/(tab)/positions">Positions</Link>
        <Text>Home screen</Text>
      </YStack>
    </MainLayout>
  );
}
