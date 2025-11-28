/**
 * TradingView Chart HTML Template
 *
 * This template creates a TradingView Advanced Chart that communicates
 * with React Native via postMessage for data fetching.
 */

interface ChartHtmlOptions {
  /** Initial symbol to display */
  symbol: string;
  /** Initial resolution */
  resolution: string;
  /**
   * Charting library base URL (must end with /)
   * Example: 'http://localhost:9000/' for local development
   * The library expects files at:
   * - {libraryPath}charting_library/charting_library.standalone.js
   * - {libraryPath}charting_library/bundles/...
   */
  libraryPath: string;
}

/**
 * Generate the HTML content for the TradingView chart WebView
 */
export function generateChartHtml(options: ChartHtmlOptions): string {
  const { symbol, resolution, libraryPath } = options;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
  <title>${symbol} Chart</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0a0a0a;
    }
    #tv_chart_container {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="tv_chart_container"></div>

  <script src="${libraryPath}charting_library/charting_library.standalone.js"></script>
  <script>
    // ========================================================================
    // Configuration
    // ========================================================================

    // Supported resolutions matching Hyperliquid
    // Minutes: 1m, 3m, 5m, 15m, 30m
    // Hours: 1h, 2h, 4h, 8h, 12h
    // Days: 1d, 3d, 1w, 1M
    const SUPPORTED_RESOLUTIONS = ['1', '3', '5', '15', '30', '60', '120', '240', '480', '720', '1D', '3D', '1W', '1M'];

    // Favorite resolutions shown as quick buttons in header (1h, 4h, D)
    const FAVORITE_RESOLUTIONS = ['60', '240', '1D'];

    // Resolution mapping: TradingView -> Hyperliquid
    const TV_TO_HL_RESOLUTION = {
      '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
      '60': '1h', '120': '2h', '240': '4h', '480': '8h', '720': '12h',
      'D': '1d', '1D': '1d', '3D': '3d',
      'W': '1w', '1W': '1w',
      'M': '1M', '1M': '1M'
    };

    // ========================================================================
    // Request/Response Bridge
    // ========================================================================

    let requestId = 0;
    const pendingRequests = new Map();

    function sendToReactNative(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    function requestData(type, params) {
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        pendingRequests.set(id, { resolve, reject });

        sendToReactNative({
          type: 'request',
          id,
          requestType: type,
          params
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 30000);
      });
    }

    // Handle responses from React Native
    function handleRNMessage(message) {
      if (message.type === 'response' && message.id) {
          const pending = pendingRequests.get(message.id);
          if (pending) {
            pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error));
            } else {
              pending.resolve(message.data);
            }
          }
        } else if (message.type === 'candleUpdate') {
          // Handle real-time candle updates
          handleCandleUpdate(message.data);
        } else if (message.type === 'changeSymbol') {
          // Handle symbol change from React Native
          if (window.tvWidget) {
            window.tvWidget.setSymbol(message.symbol, message.resolution || window.tvWidget.chart().resolution());
          }
        }
    }

    function handleMessage(event) {
      try {
        const message = JSON.parse(event.data);
        handleRNMessage(message);
      } catch (e) {
        console.error('Error handling message:', e);
      }
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage); // For Android

    // ========================================================================
    // Real-time Updates
    // ========================================================================

    const subscribers = new Map();

    function handleCandleUpdate(candle) {
      // Find matching subscribers and update them
      subscribers.forEach((subscriber, key) => {
        if (subscriber.symbolInfo.ticker === candle.s &&
            TV_TO_HL_RESOLUTION[subscriber.resolution] === candle.i) {
          const bar = {
            time: candle.t,
            open: parseFloat(candle.o),
            high: parseFloat(candle.h),
            low: parseFloat(candle.l),
            close: parseFloat(candle.c),
            volume: parseFloat(candle.v)
          };
          subscriber.onTick(bar);
        }
      });
    }

    // ========================================================================
    // Hyperliquid Datafeed
    // ========================================================================

    const HyperliquidDatafeed = {
      onReady: function(callback) {
        setTimeout(() => {
          callback({
            supported_resolutions: SUPPORTED_RESOLUTIONS,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [{ value: 'Hyperliquid', name: 'Hyperliquid', desc: 'Hyperliquid Perp DEX' }],
            symbols_types: [{ name: 'Perpetual', value: 'perpetual' }]
          });
        }, 0);
      },

      searchSymbols: function(userInput, exchange, symbolType, onResult) {
        // For now, return empty - symbols are selected externally
        onResult([]);
      },

      resolveSymbol: function(symbolName, onResolve, onError) {
        // Extract coin from symbol (e.g., "BTC" from "BTC-USD" or just "BTC")
        const coin = symbolName.replace('-USD', '').replace('-PERP', '').toUpperCase();

        requestData('resolveSymbol', { coin })
          .then((symbolInfo) => {
            onResolve({
              name: coin + '-USD',
              ticker: coin,
              description: coin + ' Perpetual',
              type: 'perpetual',
              session: '24x7',
              timezone: 'Etc/UTC',
              exchange: 'Hyperliquid',
              listed_exchange: 'Hyperliquid',
              minmov: 1,
              pricescale: symbolInfo.pricescale || 100,
              has_intraday: true,
              has_daily: true,
              has_weekly_and_monthly: true,
              supported_resolutions: SUPPORTED_RESOLUTIONS,
              intraday_multipliers: ['1', '3', '5', '15', '30', '60', '120', '240', '480', '720'],
              volume_precision: 4,
              data_status: 'streaming',
              format: 'price'
            });
          })
          .catch((error) => {
            console.error('resolveSymbol error:', error);
            onError('Symbol not found');
          });
      },

      getBars: function(symbolInfo, resolution, periodParams, onResult, onError) {
        const hlInterval = TV_TO_HL_RESOLUTION[resolution] || '1h';
        const coin = symbolInfo.ticker;

        requestData('getBars', {
          coin,
          interval: hlInterval,
          from: periodParams.from * 1000,  // Convert to ms
          to: periodParams.to * 1000,      // Convert to ms
          countBack: periodParams.countBack,
          firstDataRequest: periodParams.firstDataRequest
        })
          .then((result) => {
            if (!result.bars || result.bars.length === 0) {
              onResult([], { noData: true });
              return;
            }

            // Convert Hyperliquid candles to TradingView bars
            const bars = result.bars.map(candle => ({
              time: candle.t,  // Already in ms
              open: parseFloat(candle.o),
              high: parseFloat(candle.h),
              low: parseFloat(candle.l),
              close: parseFloat(candle.c),
              volume: parseFloat(candle.v)
            }));

            onResult(bars, { noData: false });
          })
          .catch((error) => {
            console.error('getBars error:', error);
            onError(error.message || 'Failed to fetch bars');
          });
      },

      subscribeBars: function(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
        const hlInterval = TV_TO_HL_RESOLUTION[resolution] || '1h';

        subscribers.set(listenerGuid, {
          symbolInfo,
          resolution,
          onTick,
          onResetCacheNeededCallback
        });

        // Notify React Native to start subscription
        sendToReactNative({
          type: 'subscribeBars',
          listenerGuid,
          coin: symbolInfo.ticker,
          interval: hlInterval
        });
      },

      unsubscribeBars: function(listenerGuid) {
        subscribers.delete(listenerGuid);

        // Notify React Native to stop subscription
        sendToReactNative({
          type: 'unsubscribeBars',
          listenerGuid
        });
      },

      getServerTime: function(callback) {
        callback(Math.floor(Date.now() / 1000));
      }
    };

    // ========================================================================
    // Initialize Chart
    // ========================================================================

    function initChart() {
      window.tvWidget = new TradingView.widget({
        container: 'tv_chart_container',
        fullscreen: true,
        symbol: '${symbol}',
        interval: '${resolution}',
        datafeed: HyperliquidDatafeed,
        library_path: '${libraryPath}charting_library/',
        locale: 'en',
        timezone: 'Etc/UTC',
        theme: 'dark',

        // Mobile optimizations
        disabled_features: [
          'use_localstorage_for_settings',
          'header_symbol_search',
          'header_compare',
          'header_undo_redo',
          'header_screenshot',
          'header_saveload',
          'border_around_the_chart',
          'context_menus',
          'go_to_date',
          'timezone_menu',
          'legend_context_menu',
          'main_series_scale_menu',
          'display_market_status',
          'symbol_search_hot_key',
          'study_dialog_search_control'
        ],
        enabled_features: [
          'move_logo_to_main_pane',
          'hide_left_toolbar_by_default',
          'header_resolutions',
          'items_favoriting',
          'show_hide_button_in_legend',
          'side_toolbar_in_fullscreen_mode'
        ],

        // Style overrides for dark theme
        overrides: {
          'paneProperties.background': '#0a0a0a',
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': '#1f2937',
          'paneProperties.horzGridProperties.color': '#1f2937',
          'scalesProperties.textColor': '#9ca3af',
          'scalesProperties.lineColor': '#374151',
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
        },

        loading_screen: {
          backgroundColor: '#0a0a0a',
          foregroundColor: '#3b82f6'
        },

        // Favorite intervals shown as quick buttons in header (5m, 1h, D)
        favorites: {
          intervals: FAVORITE_RESOLUTIONS,
          chartTypes: []
        },

        // Callback when chart is ready
        auto_save_delay: 5,
        debug: false
      });

      window.tvWidget.onChartReady(() => {
        // Add button to toggle left toolbar (drawing tools)
        const button = window.tvWidget.createButton();
        button.setAttribute('title', 'Toggle Drawing Tools');
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
        button.addEventListener('click', () => {
          window.tvWidget.chart().executeActionById('drawingToolbarAction');
        });

        sendToReactNative({ type: 'chartReady' });
      });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChart);
    } else {
      initChart();
    }
  </script>
</body>
</html>
  `.trim();
}

/**
 * Default chart options for mobile
 */
export const defaultChartOptions: ChartHtmlOptions = {
  symbol: 'BTC',
  resolution: '60', // 1 hour
  // CDN hosted charting library - no local server required
  libraryPath: 'https://d1n6xgrj1qiiow.cloudfront.net/',
};

/**
 * Get the charting library path from environment or default
 */
export function getChartingLibraryPath(): string {
  // In production, this would be configured to point to bundled assets
  // For development, use local server
  return process.env.EXPO_PUBLIC_CHARTING_LIBRARY_URL || defaultChartOptions.libraryPath;
}
