import { PerpTradePanel } from '@/components/trade/PerpTradePanel';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const router = useRouter();
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();
  const { selectedMarket, setSelectedMarketByCoin } = useMarketsStore();

  // Track if we're currently syncing to prevent infinite loops
  const isSyncingRef = useRef(false);

  // Bidirectional sync 1: URL → Store
  // When URL changes (e.g., deep link, direct navigation), update store
  useEffect(() => {
    if (isSyncingRef.current) return;

    const urlCoin = (coin as string).toUpperCase();
    const currentCoin = selectedMarket?.coin;

    // Only update if URL param differs from current selection
    if (urlCoin && urlCoin !== currentCoin) {
      isSyncingRef.current = true;
      setSelectedMarketByCoin(urlCoin);
      // Reset sync flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [coin, selectedMarket?.coin, setSelectedMarketByCoin]);

  // Bidirectional sync 2: Store → URL
  // When selectedMarket changes (e.g., clicking position, selecting from market list), update URL
  useEffect(() => {
    if (isSyncingRef.current) return;

    const urlCoin = (coin as string).toUpperCase();
    const storeCoin = selectedMarket?.coin;

    // Only update URL if store coin differs from URL and store has a valid coin
    if (storeCoin && storeCoin !== urlCoin) {
      isSyncingRef.current = true;
      // Use replace to avoid adding to navigation history (smoother UX)
      router.setParams({ coin: storeCoin });
      // Reset sync flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [selectedMarket?.coin, coin, router]);

  return (
    <YStack backgroundColor="$gray3">
      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      {/* PerpTradePanel now reads directly from useMarketsStore instead of props */}
      <PerpTradePanel />

      {/* PERP Tabs moved to Layout - now rendered at bottom of screen, persists across market switches */}
    </YStack>
  );
}
