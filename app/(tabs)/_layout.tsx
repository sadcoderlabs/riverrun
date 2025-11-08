import { useMarketsStore } from '@/lib/hyperliquid/market';
import { Home, TrendingUp } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, YStack } from 'tamagui';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';
import type * as hl from '@nktkas/hyperliquid';

/**
 * Tabs Layout
 *
 * Responsibility: Provide bottom tab navigation (Home/Trade) for main app
 * This layout wraps all pages in the (tabs) group and adds:
 * - Bottom tab bar (Home, Trade) using Expo Router Tabs
 * - Safe area handling (top and bottom)
 * - Market data initialization (once at app level)
 *
 * Benefits over Stack navigation:
 * - Proper unmounting of inactive tabs (fixes memory leaks)
 * - Native tab bar behavior
 * - Better performance and UX
 */
export default function TabsLayout() {
  const setMarkets = useMarketsStore(state => state.setMarkets);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Fetch metaAndAssetCtxs using TanStack Query (HTTP only, no WebSocket for this endpoint)
  const { data: marketData } = useQuery({
    queryKey: ['metaAndAssetCtxs'],
    queryFn: async () => {
      const metaAndAssetCtxs = await infoClient.metaAndAssetCtxs();
      return { metaAndAssetCtxs } as { metaAndAssetCtxs: hl.MetaAndAssetCtxsResponse };
    },
    staleTime: 60000, // Cache for 1 minute (market metadata doesn't change frequently)
  });

  // Sync subscription data to markets store
  useEffect(() => {
    if (marketData?.metaAndAssetCtxs) {
      const [meta, assetCtxs] = marketData.metaAndAssetCtxs;

      const markets = meta.universe.map((asset: any, index: number) => {
        const ctx = assetCtxs[index];
        const currentPrice = parseFloat(ctx.markPx);
        const prevDayPrice = parseFloat(ctx.prevDayPx);
        const priceChange =
          prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;

        return {
          marketPair: `${asset.name}-USD`,
          coin: asset.name,
          assetId: index, // Asset ID is the index in meta.universe array
          price: currentPrice,
          change: priceChange,
          maxLeverage: asset.maxLeverage || 1,
          fundingRate: parseFloat(ctx.funding) * 100,
          volume: parseFloat(ctx.dayNtlVlm || '0'),
          szDecimals: asset.szDecimals || 0,
        };
      });

      setMarkets(markets);
    }
  }, [marketData, setMarkets]);

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Top safe area */}
      <YStack height={insets.top} backgroundColor="$gray3" />

      {/* Tab navigation */}
      <Tabs
        screenOptions={{
          headerShown: false,
          // Ensure content doesn't go under tab bar
          sceneStyle: {
            backgroundColor: theme.gray3.val,
          },
          tabBarStyle: {
            backgroundColor: theme.background.val,
            borderTopColor: theme.borderColor.val,
            borderTopWidth: 1,
            // Respect safe area: 60px base height + bottom inset
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: theme.accent9.val,
          tabBarInactiveTintColor: theme.color9.val,
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'InterMedium',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              // @ts-expect-error - React Navigation's color type is string, Tamagui expects specific type
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trade"
          options={{
            title: 'Trade',
            tabBarIcon: ({ color, size }) => (
              // @ts-expect-error - React Navigation's color type is string, Tamagui expects specific type
              <TrendingUp size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </YStack>
  );
}
