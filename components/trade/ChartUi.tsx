import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Spinner, Text, YStack, XStack, Button } from 'tamagui';
import { useCandleData, type CandleInterval } from '@/lib/riverrun/candle/useCandleData';

interface ChartUIProps {
  marketId?: string;
}

const INTERVALS: { label: string; value: CandleInterval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export function ChartUI({ marketId }: ChartUIProps) {
  const webViewRef = useRef<WebView>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [selectedInterval, setSelectedInterval] = useState<CandleInterval>('1h');

  // Extract coin symbol from marketId (e.g., "BTC-USD" -> "BTC")
  const getCoinSymbol = (market?: string): string => {
    if (!market) return 'BTC';
    return market.split('-')[0];
  };

  const coin = getCoinSymbol(marketId);

  // Fetch candle data from Hyperliquid
  const { data, loading, error, refetch } = useCandleData({
    coin,
    interval: selectedInterval,
    refreshInterval: 60000, // Refresh every minute
  });

  // Update debug info
  useEffect(() => {
    setDebugInfo(
      `Coin: ${coin}, Data points: ${data.length}, Loading: ${loading}, Error: ${error || 'none'}, WebView: ${webViewReady ? 'ready' : 'not ready'}`,
    );
  }, [coin, data.length, loading, error, webViewReady]);

  // Send data to WebView when available
  useEffect(() => {
    if (data.length > 0 && webViewRef.current && webViewReady) {
      const message = JSON.stringify({
        type: 'updateData',
        data: data,
      });
      console.log('Sending data to WebView:', data.length, 'candles');
      webViewRef.current.postMessage(message);
    }
  }, [data, webViewReady]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${marketId || 'BTC-USD'} Chart</title>
  <script src="https://unpkg.com/lightweight-charts@4.2.1/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #0a0a0a;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    #chart {
      width: 100%;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
    }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    // Initialize chart
    const chart = LightweightCharts.createChart(document.getElementById('chart'), {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Handle window resize
    function handleResize() {
      chart.applyOptions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);

    // Notify React Native that chart is ready
    function notifyReady() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'chartReady' }));
      }
    }

    // Listen for messages from React Native
    window.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'updateData' && message.data) {
          console.log('Received data:', message.data.length, 'candles');
          // Update candlestick data
          candlestickSeries.setData(message.data);

          // Auto-fit content
          chart.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // For Android
    document.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'updateData' && message.data) {
          console.log('Received data (Android):', message.data.length, 'candles');
          candlestickSeries.setData(message.data);
          chart.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Notify ready when page loads
    notifyReady();
  </script>
</body>
</html>
  `;

  if (error) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        padding="$4"
      >
        <Text color="$red10" fontSize="$4" textAlign="center" marginBottom="$4">
          Failed to load chart: {error}
        </Text>
        <Button onPress={() => refetch()}>Retry</Button>
        <Text color="$gray10" fontSize="$2" marginTop="$4" textAlign="center">
          {debugInfo}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Interval Selector */}
      <XStack
        paddingHorizontal="$3"
        paddingVertical="$2"
        gap="$2"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        {INTERVALS.map(interval => (
          <Pressable
            key={interval.value}
            onPress={() => setSelectedInterval(interval.value)}
            style={[
              styles.intervalButton,
              selectedInterval === interval.value && styles.intervalButtonActive,
            ]}
          >
            <Text
              fontSize="$3"
              fontFamily="$interSemiBold"
              color={selectedInterval === interval.value ? 'white' : '$gray11'}
            >
              {interval.label}
            </Text>
          </Pressable>
        ))}
      </XStack>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        {loading && data.length === 0 && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$background"
            zIndex={10}
          >
            <Spinner size="large" color="$color" />
            <Text color="$color" fontSize="$4" marginTop="$4">
              Loading chart data...
            </Text>
            <Text color="$gray10" fontSize="$2" marginTop="$2">
              {debugInfo}
            </Text>
          </YStack>
        )}
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          onLoad={() => {
            console.log('WebView loaded');
            setWebViewReady(true);
          }}
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
          }}
          onMessage={(event: WebViewMessageEvent) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              console.log('Message from WebView:', message);

              if (message.type === 'chartReady') {
                console.log('Chart is ready');
                setWebViewReady(true);
              }
            } catch {
              console.log('Message from WebView (non-JSON):', event.nativeEvent.data);
            }
          }}
        />
      </View>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  chartContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  intervalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalButtonActive: {
    backgroundColor: '#3b82f6',
  },
});
