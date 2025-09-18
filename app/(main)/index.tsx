import { MainLayout } from '@/components/global/main-layout';
import { Settings, TrendingUp, User } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Button, Card, H3, Text, XStack, YStack } from 'tamagui';

export default function Index() {
  const router = useRouter();

  const navigateToTrade = () => {
    router.navigate('/(main)/trade/BTC-USD/(tab)/trade');
  };

  const navigateToSettings = () => {
    router.navigate('/settings');
  };

  return (
    <MainLayout>
      <YStack flex={1} padding="$4" space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <H3>Riverrun</H3>
          <Button
            size="$3"
            circular
            icon={<Settings size={18} />}
            onPress={navigateToSettings}
            backgroundColor="$background"
          />
        </XStack>

        <Card elevate bordered padding="$4" marginTop="$4">
          <YStack space="$2">
            <Text fontFamily="$interMedium" color="$color8">
              Welcome to
            </Text>
            <Text fontFamily="$interBold" fontSize={24}>
              Riverrun Trading
            </Text>
            <Text marginTop="$2">Your crypto futures trading app powered by Hyperliquid DEX</Text>
            <Button
              marginTop="$4"
              backgroundColor="$accent9"
              icon={<TrendingUp size={16} color="white" />}
              onPress={navigateToTrade}
            >
              <Text color="white">Start Trading</Text>
            </Button>
          </YStack>
        </Card>

        <Card elevate bordered padding="$4" marginTop="$2">
          <YStack>
            <XStack alignItems="center" space="$2" marginBottom="$2">
              <TrendingUp size={18} color="#00C097" />
              <Text fontFamily="$interSemiBold">Market Overview</Text>
            </XStack>
            <XStack justifyContent="space-between" marginBottom="$2">
              <Text>BTC-USD</Text>
              <Text fontFamily="$interSemiBold">$28,450.75</Text>
              <Text color="$green9">+2.34%</Text>
            </XStack>
            <XStack justifyContent="space-between" marginBottom="$2">
              <Text>ETH-USD</Text>
              <Text fontFamily="$interSemiBold">$1,875.25</Text>
              <Text color="$red9">-0.87%</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text>SOL-USD</Text>
              <Text fontFamily="$interSemiBold">$42.18</Text>
              <Text color="$green9">+3.65%</Text>
            </XStack>
          </YStack>
        </Card>

        <Card elevate bordered padding="$4" marginTop="$2">
          <YStack>
            <XStack alignItems="center" space="$2" marginBottom="$2">
              <User size={18} color="#00C097" />
              <Text fontFamily="$interSemiBold">Account</Text>
            </XStack>
            <XStack justifyContent="space-between" marginBottom="$2">
              <Text>Balance</Text>
              <Text fontFamily="$interSemiBold">$10,000.00</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text>PnL (24h)</Text>
              <Text fontFamily="$interSemiBold" color="$green9">
                +$245.75
              </Text>
            </XStack>
          </YStack>
        </Card>
      </YStack>
    </MainLayout>
  );
}
