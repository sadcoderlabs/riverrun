import { CleanLayout } from '@/components/global/clean-layout';
import { useRouter } from 'expo-router';
import { Separator, Text, XStack, YStack } from 'tamagui';

export default function MarketListScreen() {
  const router = useRouter();

  const markets = [
    { id: 'BTC-USD', name: 'Bitcoin', price: 28450.75, change: 2.34 },
    { id: 'ETH-USD', name: 'Ethereum', price: 1875.25, change: -0.87 },
    { id: 'SOL-USD', name: 'Solana', price: 42.18, change: 3.65 },
  ];

  const navigateToMarket = (marketId: string) => {
    router.push(`/(main)/trade/${marketId}/(tab)`);
  };

  return (
    <CleanLayout>
      <YStack flex={1} padding="$4">
        <Text fontFamily="$interSemiBold" style={{ fontSize: 18 }} marginBottom="$4">
          Markets
        </Text>

        {markets.map((market, index) => (
          <YStack key={market.id}>
            <XStack
              paddingVertical="$3"
              onPress={() => navigateToMarket(market.id)}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text flex={1} fontFamily="$interSemiBold">
                {market.name}
              </Text>
              <Text flex={1} textAlign="right">
                ${market.price.toFixed(2)}
              </Text>
              <Text flex={1} textAlign="right" color={market.change >= 0 ? '$green9' : '$red9'}>
                {market.change >= 0 ? '+' : ''}
                {market.change}%
              </Text>
            </XStack>
            {index < markets.length - 1 && <Separator />}
          </YStack>
        ))}
      </YStack>
    </CleanLayout>
  );
}
