import * as haptics from 'expo-haptics';
import { ReactNode, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CandlestickChart } from 'react-native-wagmi-charts';

/**
 * Price data point structure for candlestick chart
 */
export interface PriceDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Props for the WagmiChart component
 */
export interface WagmiChartProps {
  /**
   * Array of price data points for the candlestick chart
   */
  data: PriceDataPoint[];

  /**
   * Optional children to render inside the chart
   */
  children?: ReactNode;

  /**
   * Optional callback when user interacts with chart
   * @default Light haptic feedback
   */
  onInteraction?: () => void;
}

/**
 * A reusable candlestick chart component using react-native-wagmi-charts
 *
 * @param props WagmiChartProps
 * @returns JSX.Element
 */
export function WagmiChart({ data, children, onInteraction }: WagmiChartProps) {
  // Safe wrapper for haptic feedback that won't crash if haptics are unavailable
  const handleHapticFeedback = useCallback(() => {
    try {
      haptics
        .impactAsync(haptics.ImpactFeedbackStyle.Light)
        .catch(err => console.log('Haptic feedback error:', err));
    } catch (error) {
      console.log('Haptic feedback error:', error);
    }
  }, []);

  const handleInteraction = onInteraction || handleHapticFeedback;

  return (
    <GestureHandlerRootView style={styles.container}>
      <CandlestickChart.Provider data={data}>
        <CandlestickChart>
          <CandlestickChart.Candles />
          <CandlestickChart.Crosshair onCurrentXChange={handleInteraction}>
            <CandlestickChart.Tooltip />
          </CandlestickChart.Crosshair>
          {children}
        </CandlestickChart>
      </CandlestickChart.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingRight: 20,
  },
});
