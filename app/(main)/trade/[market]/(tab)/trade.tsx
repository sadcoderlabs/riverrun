import { MainLayout } from '@/components/global/main-layout';
import { useLocalSearchParams } from 'expo-router';
import { Button, Text, XStack, YStack } from 'tamagui';

export default function TradeScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <MainLayout>
      <YStack flex={1} padding="$4">
        <Text fontFamily="$interSemiBold" style={{ fontSize: 18 }} marginBottom="$4">
          {market} Trading
        </Text>

        {/* Price Display */}
        <XStack justifyContent="space-between" marginBottom="$6">
          <YStack>
            <Text color="$color8">Current Price</Text>
            <Text fontFamily="$interSemiBold" style={{ fontSize: 24 }}>
              $28,450.75
            </Text>
          </YStack>
          <YStack alignItems="flex-end">
            <Text color="$green9">+2.34%</Text>
            <Text color="$color8">24h Change</Text>
          </YStack>
        </XStack>

        {/* Order Entry Placeholder */}
        <YStack backgroundColor="$background" padding="$4" borderRadius="$4" marginBottom="$6">
          <Text fontFamily="$interSemiBold" marginBottom="$2">
            Order Entry
          </Text>
          <XStack justifyContent="space-between" marginBottom="$4">
            <Button backgroundColor="$green9" flex={1} marginRight="$2">
              <Text color="white">Buy</Text>
            </Button>
            <Button backgroundColor="$red9" flex={1} marginLeft="$2">
              <Text color="white">Sell</Text>
            </Button>
          </XStack>
          <Text>Order form will be implemented here</Text>
        </YStack>

        {/* Chart Placeholder */}
        <YStack
          flex={1}
          backgroundColor="$background"
          borderRadius="$4"
          padding="$4"
          justifyContent="center"
          alignItems="center"
        >
          <Text fontFamily="$interSemiBold" marginBottom="$2">
            Price Chart
          </Text>
          <Text>Trading chart will be implemented here</Text>
        </YStack>
      </YStack>
    </MainLayout>
  );
}
