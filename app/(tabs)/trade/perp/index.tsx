import { PerpTradePanel } from '@/components/trade/PerpTradePanel';
import { YStack } from 'tamagui';

/**
 * Perpetual Trade Page
 *
 * Store (useMarketsStore) is the single source of truth for selected market.
 * Deep link support is handled in _layout.tsx - URL params are read once on mount
 * to initialize the store, then market changes only update the store (no URL sync).
 */
export default function PerpTradeIndex() {
  return (
    <YStack backgroundColor="$gray3">
      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      {/* PerpTradePanel reads directly from useMarketsStore */}
      <PerpTradePanel />

      {/* PERP Tabs moved to Layout - now rendered at bottom of screen, persists across market switches */}
    </YStack>
  );
}
