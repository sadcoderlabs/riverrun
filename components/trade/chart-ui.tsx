import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { YStack } from 'tamagui';

interface ChartUIProps {
  marketId?: string;
}

export function ChartUI({ marketId }: ChartUIProps) {
  // Convert market ID format (e.g., "BTC-USD") to TradingView symbol (e.g., "BINANCE:BTCUSDZ2025")
  const getTradingViewSymbol = (market?: string): string => {
    if (!market) return 'BINANCE:BTCUSDZ2025';

    // Remove the hyphen and convert to uppercase (e.g., "BTC-USD" -> "BTCUSD")
    const baseSymbol = market.replace('-', '').toUpperCase();

    return `BINANCE:${baseSymbol}Z2025`;
  };

  const tradingViewSymbol = getTradingViewSymbol(marketId);

  const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width">
          <title>TradingView Chart</title>
          <script src="https://s3.tradingview.com/tv.js"></script>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #000000;
              overflow: hidden;
            }
            #tv_chart_container {
              width: 100%;
              height: 100%;
              position: absolute;
              top: 0;
              left: 0;
              background-color: #000000;
            }
          </style>
        </head>
        <body>
          <div id="tv_chart_container"></div>
          <script>
            new TradingView.widget({
              symbol: '${tradingViewSymbol}',
              interval: '5',
              timezone: 'Etc/UTC',
              theme: 'dark',
              width: '100%',
              height: '99.5%',
              style: '1',
              locale: 'en',
              hide_side_toolbar: true,
              toolbar_bg: '#f1f3f6',
              container_id: 'tv_chart_container'
            });
          </script>
        </body>
        </html>
      `;

  return (
    <YStack flex={1} padding="$0" position="relative" backgroundColor="$background">
      <WebView
        key={tradingViewSymbol}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.container}
        backgroundColor="#000000"
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
