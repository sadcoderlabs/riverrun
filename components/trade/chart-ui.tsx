import { Button } from '@/components/global/button';
import { WagmiChart, PriceDataPoint } from '@/components/global/wagmi-chart';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';

interface ChartUIProps {
  marketId?: string;
  onSwitchToTrade: () => void;
}

// Mock price data with 5-minute intervals (300,000 milliseconds)
const mockPriceData: PriceDataPoint[] = [
  // Starting with a base timestamp and price
  {
    timestamp: 1695552000000, // 2023-09-24 12:00:00 UTC
    open: 26450.75,
    high: 26498.32,
    low: 26425.18,
    close: 26472.45,
  },
  {
    timestamp: 1695552300000, // +5 minutes
    open: 26472.45,
    high: 26525.67,
    low: 26465.33,
    close: 26510.22,
  },
  {
    timestamp: 1695552600000, // +5 minutes
    open: 26510.22,
    high: 26545.89,
    low: 26505.11,
    close: 26538.75,
  },
  {
    timestamp: 1695552900000, // +5 minutes
    open: 26538.75,
    high: 26562.44,
    low: 26520.36,
    close: 26525.18,
  },
  {
    timestamp: 1695553200000, // +5 minutes
    open: 26525.18,
    high: 26532.65,
    low: 26487.92,
    close: 26495.37,
  },
  {
    timestamp: 1695553500000, // +5 minutes
    open: 26495.37,
    high: 26510.22,
    low: 26475.81,
    close: 26482.59,
  },
  {
    timestamp: 1695553800000, // +5 minutes
    open: 26482.59,
    high: 26498.32,
    low: 26450.75,
    close: 26465.33,
  },
  {
    timestamp: 1695554100000, // +5 minutes
    open: 26465.33,
    high: 26475.81,
    low: 26425.18,
    close: 26432.64,
  },
  {
    timestamp: 1695554400000, // +5 minutes
    open: 26432.64,
    high: 26450.75,
    low: 26410.53,
    close: 26442.19,
  },
  {
    timestamp: 1695554700000, // +5 minutes
    open: 26442.19,
    high: 26487.92,
    low: 26442.19,
    close: 26480.12,
  },
  {
    timestamp: 1695555000000, // +5 minutes
    open: 26480.12,
    high: 26525.18,
    low: 26475.81,
    close: 26515.63,
  },
  {
    timestamp: 1695555300000, // +5 minutes
    open: 26515.63,
    high: 26562.44,
    low: 26510.22,
    close: 26552.89,
  },
  {
    timestamp: 1695555600000, // +5 minutes
    open: 26552.89,
    high: 26585.25,
    low: 26538.75,
    close: 26572.11,
  },
  {
    timestamp: 1695555900000, // +5 minutes
    open: 26572.11,
    high: 26595.37,
    low: 26562.44,
    close: 26580.76,
  },
  {
    timestamp: 1695556200000, // +5 minutes
    open: 26580.76,
    high: 26605.82,
    low: 26572.11,
    close: 26598.25,
  },
  {
    timestamp: 1695556500000, // +5 minutes
    open: 26598.25,
    high: 26625.18,
    low: 26585.25,
    close: 26615.63,
  },
  {
    timestamp: 1695556800000, // +5 minutes
    open: 26615.63,
    high: 26642.44,
    low: 26605.82,
    close: 26632.89,
  },
  {
    timestamp: 1695557100000, // +5 minutes
    open: 26632.89,
    high: 26655.25,
    low: 26615.63,
    close: 26625.18,
  },
  {
    timestamp: 1695557400000, // +5 minutes
    open: 26625.18,
    high: 26632.89,
    low: 26595.37,
    close: 26605.82,
  },
  {
    timestamp: 1695557700000, // +5 minutes
    open: 26605.82,
    high: 26615.63,
    low: 26572.11,
    close: 26585.25,
  },
  {
    timestamp: 1695558000000, // +5 minutes
    open: 26585.25,
    high: 26598.25,
    low: 26552.89,
    close: 26562.44,
  },
  {
    timestamp: 1695558300000, // +5 minutes
    open: 26562.44,
    high: 26572.11,
    low: 26525.18,
    close: 26538.75,
  },
  {
    timestamp: 1695558600000, // +5 minutes
    open: 26538.75,
    high: 26552.89,
    low: 26510.22,
    close: 26525.18,
  },
  {
    timestamp: 1695558900000, // +5 minutes
    open: 26525.18,
    high: 26538.75,
    low: 26498.32,
    close: 26510.22,
  },
];

export function ChartUI({ marketId, onSwitchToTrade }: ChartUIProps) {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} padding="$0">
      {/* Loading state removed as we're using WebBrowser instead */}

      <YStack flex={1} justifyContent="center" alignItems="center">
        <WagmiChart data={mockPriceData} />
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
