/**
 * ChartUI Component
 *
 * Displays a TradingView Advanced Chart with Hyperliquid market data.
 * Uses WebView to render the chart and communicates via postMessage for data.
 */

import { TradingViewChart } from './chart/TradingViewChart';

interface ChartUIProps {
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin?: string;
  /** Callback when chart is ready */
  onChartReady?: () => void;
}

/**
 * ChartUI wraps TradingViewChart for use in the app
 *
 * Features:
 * - TradingView Advanced Chart with full indicator support
 * - Real-time candle updates via Hyperliquid WebSocket
 * - Built-in resolution picker (TradingView's native selector)
 * - Mobile-optimized dark theme
 */
export function ChartUI({ coin = 'BTC', onChartReady }: ChartUIProps) {
  return (
    <TradingViewChart
      coin={coin}
      initialResolution="60" // 1 hour default
      onChartReady={onChartReady}
    />
  );
}
