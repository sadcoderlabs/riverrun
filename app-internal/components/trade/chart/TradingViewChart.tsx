/**
 * TradingView Advanced Chart Component
 *
 * Renders TradingView chart in a WebView and handles data communication
 * with Hyperliquid API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { YStack, Spinner, Text } from 'tamagui';
import * as infoClient from '@/infra/hyperliquid/client/infoClient';
import { subscriptionManager } from '@/infra/hyperliquid/subscription/subscriptionManager';
import type { SubscriptionHandle } from '@/infra/hyperliquid/subscription/types';
import { generateChartHtml, getChartingLibraryPath } from './chartHtml';
import type { CandleInterval } from '@/infra/hyperliquid/hooks/useCandleSnapshot';

interface TradingViewChartProps {
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Initial resolution in TradingView format (e.g., "60" for 1h) */
  initialResolution?: string;
  /** Callback when chart is ready */
  onChartReady?: () => void;
}

interface WebViewMessage {
  type: string;
  id?: number;
  requestType?: string;
  params?: Record<string, unknown>;
  listenerGuid?: string;
  coin?: string;
  interval?: CandleInterval;
}

interface CandleSubscription {
  listenerGuid: string;
  coin: string;
  interval: CandleInterval;
  handle?: SubscriptionHandle;
}

/**
 * Get price scale based on price magnitude
 */
function getPriceScale(coin: string): number {
  // Common price scales for different coins
  const priceScales: Record<string, number> = {
    BTC: 10, // 0.1 precision
    ETH: 100, // 0.01 precision
    SOL: 1000, // 0.001 precision
    DOGE: 100000, // 0.00001 precision
  };

  return priceScales[coin.toUpperCase()] || 1000; // Default to 0.001 precision
}

export function TradingViewChart({
  coin,
  initialResolution = '60',
  onChartReady,
}: TradingViewChartProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const subscriptionsRef = useRef<Map<string, CandleSubscription>>(new Map());

  // Generate HTML content for WebView
  const htmlContent = generateChartHtml({
    symbol: coin,
    resolution: initialResolution,
    libraryPath: getChartingLibraryPath(),
  });

  /**
   * Send message to WebView
   */
  const sendToWebView = useCallback((message: Record<string, unknown>) => {
    if (webViewRef.current) {
      const script = `
        window.postMessage(${JSON.stringify(JSON.stringify(message))}, '*');
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  /**
   * Handle resolveSymbol request
   */
  const handleResolveSymbol = useCallback(
    async (id: number, params: { coin: string }) => {
      try {
        const pricescale = getPriceScale(params.coin);
        sendToWebView({
          type: 'response',
          id,
          data: { pricescale },
        });
      } catch (err) {
        sendToWebView({
          type: 'response',
          id,
          error: err instanceof Error ? err.message : 'Failed to resolve symbol',
        });
      }
    },
    [sendToWebView],
  );

  /**
   * Handle getBars request
   */
  const handleGetBars = useCallback(
    async (
      id: number,
      params: {
        coin: string;
        interval: CandleInterval;
        from: number;
        to: number;
        countBack: number;
        firstDataRequest: boolean;
      },
    ) => {
      try {
        // Calculate time range
        // For first request, fetch more data
        const now = Date.now();
        let startTime = params.from;
        let endTime = params.to;

        // Ensure we have enough data by extending the range if needed
        if (params.firstDataRequest) {
          // Fetch at least 500 candles for first request
          const intervalMs = getIntervalMs(params.interval);
          startTime = Math.min(startTime, now - intervalMs * 500);
        }

        const candles = await infoClient.candleSnapshot({
          coin: params.coin,
          interval: params.interval,
          startTime,
          endTime,
        });

        sendToWebView({
          type: 'response',
          id,
          data: { bars: candles || [] },
        });
      } catch (err) {
        console.error('getBars error:', err);
        sendToWebView({
          type: 'response',
          id,
          error: err instanceof Error ? err.message : 'Failed to fetch bars',
        });
      }
    },
    [sendToWebView],
  );

  /**
   * Handle subscribeBars request - subscribe to real-time candle updates via WebSocket
   */
  const handleSubscribeBars = useCallback(
    async (listenerGuid: string, coinSymbol: string, interval: CandleInterval) => {
      try {
        // Subscribe to candle updates via WebSocket
        const handle = await subscriptionManager.subscribe(
          'candle',
          { coin: coinSymbol.toUpperCase(), interval },
          (candleEvent: any) => {
            // Send candle update to WebView
            sendToWebView({
              type: 'candleUpdate',
              data: candleEvent,
            });
          },
        );

        const subscription: CandleSubscription = {
          listenerGuid,
          coin: coinSymbol,
          interval,
          handle,
        };

        subscriptionsRef.current.set(listenerGuid, subscription);
        console.log(`[TradingViewChart] Subscribed to candle: ${coinSymbol} ${interval}`);
      } catch (err) {
        console.error('[TradingViewChart] Failed to subscribe to candle:', err);
      }
    },
    [sendToWebView],
  );

  /**
   * Handle unsubscribeBars request
   */
  const handleUnsubscribeBars = useCallback(async (listenerGuid: string) => {
    const subscription = subscriptionsRef.current.get(listenerGuid);
    if (subscription?.handle) {
      try {
        await subscriptionManager.unsubscribe(subscription.handle);
        console.log(
          `[TradingViewChart] Unsubscribed from candle: ${subscription.coin} ${subscription.interval}`,
        );
      } catch (err) {
        console.error('[TradingViewChart] Failed to unsubscribe from candle:', err);
      }
    }
    subscriptionsRef.current.delete(listenerGuid);
  }, []);

  /**
   * Handle messages from WebView
   */
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: WebViewMessage = JSON.parse(event.nativeEvent.data);

        switch (message.type) {
          case 'chartReady':
            setIsLoading(false);
            onChartReady?.();
            break;

          case 'request':
            if (message.id && message.requestType && message.params) {
              switch (message.requestType) {
                case 'resolveSymbol':
                  handleResolveSymbol(message.id, message.params as { coin: string });
                  break;
                case 'getBars':
                  handleGetBars(
                    message.id,
                    message.params as {
                      coin: string;
                      interval: CandleInterval;
                      from: number;
                      to: number;
                      countBack: number;
                      firstDataRequest: boolean;
                    },
                  );
                  break;
              }
            }
            break;

          case 'subscribeBars':
            if (message.listenerGuid && message.coin && message.interval) {
              handleSubscribeBars(message.listenerGuid, message.coin, message.interval);
            }
            break;

          case 'unsubscribeBars':
            if (message.listenerGuid) {
              handleUnsubscribeBars(message.listenerGuid);
            }
            break;
        }
      } catch (err) {
        console.error('Error handling WebView message:', err);
      }
    },
    [handleResolveSymbol, handleGetBars, handleSubscribeBars, handleUnsubscribeBars, onChartReady],
  );

  /**
   * Change symbol when coin prop changes
   */
  useEffect(() => {
    if (!isLoading && webViewRef.current) {
      sendToWebView({
        type: 'changeSymbol',
        symbol: coin,
      });
    }
  }, [coin, isLoading, sendToWebView]);

  /**
   * Cleanup subscriptions on unmount
   */
  useEffect(() => {
    const subscriptions = subscriptionsRef.current;
    return () => {
      subscriptions.forEach(subscription => {
        if (subscription.handle) {
          void subscriptionManager.unsubscribe(subscription.handle);
        }
      });
      subscriptions.clear();
    };
  }, []);

  if (error) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Text color="$red10" fontSize="$4">
          {error}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {isLoading && (
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
            Loading chart...
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
        onMessage={handleMessage}
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError('Failed to load chart');
        }}
      />
    </YStack>
  );
}

/**
 * Get interval duration in milliseconds
 */
function getIntervalMs(interval: CandleInterval): number {
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  const intervalMs: Record<CandleInterval, number> = {
    '1m': 1 * MS_PER_MINUTE,
    '3m': 3 * MS_PER_MINUTE,
    '5m': 5 * MS_PER_MINUTE,
    '15m': 15 * MS_PER_MINUTE,
    '30m': 30 * MS_PER_MINUTE,
    '1h': 1 * MS_PER_HOUR,
    '2h': 2 * MS_PER_HOUR,
    '4h': 4 * MS_PER_HOUR,
    '8h': 8 * MS_PER_HOUR,
    '12h': 12 * MS_PER_HOUR,
    '1d': 1 * MS_PER_DAY,
    '3d': 3 * MS_PER_DAY,
    '1w': 7 * MS_PER_DAY,
    '1M': 30 * MS_PER_DAY,
  };

  return intervalMs[interval];
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
