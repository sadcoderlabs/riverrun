import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { ChartUI } from '@/components/trade/ChartUi';
import { formatMarketId } from '@/lib/hyperliquid/market';

/**
 * Full-Screen Chart Page
 *
 * Displays a full-screen chart for the selected market
 * Accessed by clicking the chart icon in CoinInfo component
 */
export default function ChartPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ coin: string }>();

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = formatMarketId(params.coin, 'perp');

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      {/* Header */}
      <XStack
        alignItems="center"
        gap="$3"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="$color" />
        </Pressable>
        <XStack alignItems="center" gap="$2">
          <Text fontFamily="$interSemiBold" fontSize="$6">
            {marketDisplay}
          </Text>
          <XStack
            backgroundColor="#F97316"
            borderRadius="$2"
            paddingHorizontal="$2"
            paddingVertical="$1"
          >
            <Text fontFamily="$interSemiBold" fontSize="$2" color="white">
              PERP
            </Text>
          </XStack>
        </XStack>
      </XStack>

      {/* Full-Screen Chart */}
      <ChartUI marketId={marketDisplay} />
    </YStack>
  );
}
