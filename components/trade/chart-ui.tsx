import { Button } from '@/components/global/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

interface ChartUIProps {
  marketId?: string;
  onSwitchToTrade: () => void;
}

export function ChartUI({ marketId, onSwitchToTrade }: ChartUIProps) {
  const insets = useSafeAreaInsets();

  // Convert marketId to TradingView symbol format
  // const getSymbol = () => {
  //   if (!marketId) return 'BINANCE:BTCUSDT';

  //   // Remove the '-' and convert to TradingView format
  //   // Example: BTC-USD -> BINANCE:BTCUSDT
  //   const parts = marketId.split('-');
  //   if (parts.length === 2) {
  //     return `BINANCE:${parts[0]}${parts[1]}`;
  //   }

  //   return 'BINANCE:BTCUSDT';
  // };

  // We're no longer using the WebView with HTML content

  return (
    <YStack flex={1} padding="$0">
      {/* Loading state removed as we're using WebBrowser instead */}

      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$color" fontSize="$5" textAlign="center" padding="$4" marginBottom="$4">
          Pull {marketId} Chart in here
        </Text>
      </YStack>
      <YStack flex={1} justifyContent="center" alignItems="center">
        <XStack
          position="absolute"
          bottom={insets.bottom > 0 ? insets.bottom : 16}
          left={16}
          right={16}
          zIndex={2}
        >
          <Button.Filled onPress={onSwitchToTrade} level="lg" width="100%">
            Trade
          </Button.Filled>
        </XStack>
      </YStack>
    </YStack>
  );
}
