import { Button } from '@/components/global/button';
import { MainLayout } from '@/components/global/main-layout';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View, YStack } from 'tamagui';

export default function TradeIndex() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <MainLayout>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text fontFamily="$interSemiBold" style={{ fontSize: 16 }}>
          Trading {market}
        </Text>
        <Text marginTop="$2">Trading interface will be implemented here</Text>
        <YStack mt="$4" gap="$2">
          <Link href="/(main)/trade/market-list" asChild>
            <Button.Filled my="$2" level="md">
              Check Markets List
            </Button.Filled>
          </Link>
          <Link href="/(main)/trade/[market]/(tab)/positions" asChild>
            <Button.Filled my="$2" level="md">
              Check Positions
            </Button.Filled>
          </Link>
          <Link href="/(main)/trade/[market]/(tab)/orders" asChild>
            <Button.Filled my="$2" level="md">
              Check Orders
            </Button.Filled>
          </Link>
          <Link href="/(main)/trade/[market]/(tab)/history" asChild>
            <Button.Filled my="$2" level="md">
              Check History
            </Button.Filled>
          </Link>
        </YStack>
      </View>
    </MainLayout>
  );
}
