import { Button } from '@/components/global/button';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { XStack, YStack } from 'tamagui';

interface ChartUIProps {
  marketId?: string;
  onSwitchToTrade: () => void;
}

export function ChartUI({ marketId, onSwitchToTrade }: ChartUIProps) {
  const insets = useSafeAreaInsets();

  const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width">
          <title>TradingView Chart</title>
          <script src="https://s3.tradingview.com/tv.js"></script>
          <style>
            #tv_chart_container {
              width: 100%;
              height: 100%;
              position: absolute;
              top: 0;
              left: 0;
            }
          </style>
        </head>
        <body>
          <div id="tv_chart_container"></div>
          <script>
            new TradingView.widget({
              symbol: 'BINANCE:BTCUSD',
              interval: '5',
              timezone: 'Etc/UTC',
              theme: 'dark',
              width: '100%',
              height: '99.5%',
              style: '1',
              locale: 'en',
              hide_side_toolbar: false,
              toolbar_bg: '#f1f3f6',
              container_id: 'tv_chart_container'
            });
          </script>
        </body>
        </html>
      `;

  return (
    <YStack flex={1} padding="$0" position="relative">
      <WebView originWhitelist={['*']} source={{ html: htmlContent }} style={styles.container} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
