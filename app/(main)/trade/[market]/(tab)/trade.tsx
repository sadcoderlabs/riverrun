import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Text, YStack } from 'tamagui';

export default function TradeScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <MainLayout>
      <YStack flex={1} padding="$4">
        <Text fontFamily="$interSemiBold" style={{ fontSize: 18 }} marginBottom="$4">
          This is trade {market} screen
        </Text>
      </YStack>
    </MainLayout>
  );
}
