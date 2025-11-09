import AdaptiveSelect from '@/components/global/AdaptiveSelect';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatSizeFixedDecimals } from '@/lib/hyperliquid/format/formatSizeFixedDecimals';
import { useActiveAssetCtx, useTrades } from '@/lib/hyperliquid/hooks';
import { useMarketsStore } from '@/lib/riverrun/market';
import { useLatestPrice } from '@/lib/riverrun/orderbook/useLatestPrice';
import {
  buildPrecisionMenu,
  type NSigFigs,
  type OrderBookLevel,
  type PrecisionMenuItem,
} from '@/lib/riverrun/orderbook/orderbookPrecision';
import { useSubscription, type OrderBookData } from '@/lib/hyperliquid/subscription';
import { ArrowDownRight, ArrowUpRight, ChevronDown, Info } from '@tamagui/lucide-icons';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Button, Popover, Text, XStack, YStack } from 'tamagui';
import { OrderBookRow } from './OrderBookRow';

interface OrderBookProps {
  onPriceClick?: (price: string) => void;
}

type SizeUnit = 'usd' | 'asset';

/**
 * Order Book component displaying real-time bids and asks with dynamic precision control
 *
 * Features:
 * - Dynamic precision menu based on current price and asset decimals
 * - Automatic resubscription when precision changes
 * - Size display in USD or asset units
 * - Derives all market data from selectedMarket in useMarketsStore
 *
 * Layout: Asks (top, reversed) -> Bids (bottom)
 */
export function OrderBook({ onPriceClick }: OrderBookProps) {
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('usd');
  // Selected precision: null for full, or the nSigFigs value
  const [selectedPrecision, setSelectedPrecision] = useState<NSigFigs | undefined>(undefined);
  // Mark price popover state
  const [markPricePopoverOpen, setMarkPricePopoverOpen] = useState(false);

  // Get selected market from store
  const { selectedMarket } = useMarketsStore();
  const coin = selectedMarket?.coin || 'BTC';
  const szDecimals = selectedMarket?.szDecimals || 2;

  // Subscribe to real-time asset context data for markPx
  const { data: assetCtx } = useActiveAssetCtx({ coin });
  const markPx = assetCtx?.ctx.markPx || '0';

  // Subscribe to recent trades and extract latest price
  const { trades } = useTrades({ coin });
  const { latestPrice } = useLatestPrice({ trades });

  // Calculate precision menu items based on current mark price
  // This menu dynamically adjusts based on the price level of the asset
  const precisionMenuItems = useMemo<PrecisionMenuItem[]>(() => {
    try {
      const price = parseFloat(markPx);
      // Only calculate if we have a valid price
      if (!price || price <= 0) {
        return [];
      }
      return buildPrecisionMenu(price, szDecimals);
    } catch (err) {
      console.error('[OrderBook] Error building precision menu:', err);
      return [];
    }
  }, [markPx, szDecimals]);

  // Default to first menu item (finest precision) if not selected
  // Use null instead of undefined to prevent subscription from restarting when precisionMenuItems loads
  const effectiveNSigFigs = selectedPrecision ?? precisionMenuItems[0]?.nSigFigs ?? null;

  // Subscribe to order book using unified subscription system
  const { data, isLoading, error } = useSubscription<OrderBookData>('orderBook', {
    coin,
    nSigFigs: effectiveNSigFigs,
  });

  // Prepare asks data (reversed for top-down display, limited to 10)
  const reversedAsks = useMemo(() => {
    if (!data?.asks) return [];
    return [...data.asks].slice(0, 10).reverse();
  }, [data?.asks]);

  // Prepare bids data (limited to 10)
  const limitedBids = useMemo(() => {
    if (!data?.bids) return [];
    return data.bids.slice(0, 10);
  }, [data?.bids]);

  // Calculate total liquidity for cumulative depth calculation
  const totalLiquidity = useMemo(() => {
    if (!reversedAsks.length && !limitedBids.length) return 0;
    const allVisibleSizes = [...reversedAsks, ...limitedBids].map(level => parseFloat(level.sz));
    return allVisibleSizes.reduce((sum, size) => sum + size, 0);
  }, [reversedAsks, limitedBids]);

  // Calculate cumulative depth for asks (from best ask price going up)
  const asksWithCumulative = useMemo(() => {
    if (!reversedAsks.length || totalLiquidity === 0) return [];

    let cumulative = 0;
    // reversedAsks is already reversed, so we need to accumulate from the end (best price)
    return reversedAsks.map((ask, index) => {
      // Accumulate from the best price (last item in reversedAsks array)
      const fromBestPrice = reversedAsks.slice(index);
      cumulative = fromBestPrice.reduce((sum, a) => sum + parseFloat(a.sz), 0);
      return {
        ...ask,
        cumulativePercentage: (cumulative / totalLiquidity) * 100,
      };
    });
  }, [reversedAsks, totalLiquidity]);

  // Calculate cumulative depth for bids (from best bid price going down)
  const bidsWithCumulative = useMemo(() => {
    if (!limitedBids.length || totalLiquidity === 0) return [];

    return limitedBids.map((bid, index) => {
      // Accumulate from best price (index 0) to current
      const cumulative = limitedBids
        .slice(0, index + 1)
        .reduce((sum, b) => sum + parseFloat(b.sz), 0);
      return {
        ...bid,
        cumulativePercentage: (cumulative / totalLiquidity) * 100,
      };
    });
  }, [limitedBids, totalLiquidity]);

  // Render individual order book row
  const renderOrderBookRow = (
    item: OrderBookLevel & { cumulativePercentage: number },
    type: 'bid' | 'ask',
  ) => {
    // Calculate display size based on unit
    let displaySize: string;
    if (sizeUnit === 'usd') {
      // USD mode: calculate USD value and format as integer with thousand separators
      const sizeInUsd = parseFloat(item.sz) * parseFloat(item.px);
      displaySize = formatSizeFixedDecimals(sizeInUsd, 0, true);
    } else {
      // Asset mode: format with fixed decimals for alignment, no thousand separators
      displaySize = formatSizeFixedDecimals(item.sz, szDecimals, false);
    }

    return (
      <OrderBookRow
        key={`${type}-${item.px}`}
        price={item.px}
        size={displaySize}
        type={type}
        depthPercentage={item.cumulativePercentage}
        szDecimals={szDecimals}
        sizeUnit={sizeUnit}
        onPress={() => onPriceClick?.(item.px)}
      />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
          Loading order book...
        </Text>
      </YStack>
    );
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$red10">
          Failed to load order book
        </Text>
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10" marginTop="$2">
          {error.message}
        </Text>
      </YStack>
    );
  }

  // No data state
  if (!data) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
          No order book data
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" borderWidth={0}>
      {/* Selectors Row - Precision & Size Unit Dropdowns */}
      <XStack
        paddingHorizontal="$1.5"
        paddingVertical="$1"
        backgroundColor="$background"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Precision Dropdown - dynamically generated based on price and szDecimals */}
        <AdaptiveSelect
          value={String(effectiveNSigFigs ?? 'null')}
          onValueChange={value => {
            // Convert string back to NSigFigs
            const nSigFigs = value === 'null' ? null : (parseInt(value) as NSigFigs);
            setSelectedPrecision(nSigFigs);
          }}
          title="Precision"
        >
          <AdaptiveSelect.Trigger>
            <XStack
              gap="$1"
              alignItems="center"
              backgroundColor="$gray3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              height={24}
              borderRadius="$2"
              borderWidth={1}
              borderColor="$gray6"
            >
              <Text fontFamily="$interMedium" fontSize="$2" color="$color">
                {precisionMenuItems.find(item => item.nSigFigs === effectiveNSigFigs)?.label || '?'}
              </Text>
              <ChevronDown size={12} color="$gray10" />
            </XStack>
          </AdaptiveSelect.Trigger>
          {/* Dynamically render menu items based on calculated precision levels */}
          {precisionMenuItems.map((item, index) => (
            <AdaptiveSelect.Item
              key={String(item.nSigFigs ?? 'null')}
              value={String(item.nSigFigs ?? 'null')}
              index={index}
            >
              {item.label}
            </AdaptiveSelect.Item>
          ))}
        </AdaptiveSelect>

        {/* Size Unit Dropdown */}
        <AdaptiveSelect
          value={sizeUnit}
          onValueChange={value => setSizeUnit(value as SizeUnit)}
          title="Size Unit"
        >
          <AdaptiveSelect.Trigger>
            <XStack
              gap="$1"
              alignItems="center"
              backgroundColor="$gray3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              height={24}
              borderRadius="$2"
              borderWidth={1}
              borderColor="$gray6"
            >
              <Text fontFamily="$interMedium" fontSize="$2" color="$color">
                {sizeUnit === 'usd' ? 'USD' : coin}
              </Text>
              <ChevronDown size={12} color="$gray10" />
            </XStack>
          </AdaptiveSelect.Trigger>
          <AdaptiveSelect.Item value="usd" index={0}>
            USD
          </AdaptiveSelect.Item>
          <AdaptiveSelect.Item value="asset" index={1}>
            {coin}
          </AdaptiveSelect.Item>
        </AdaptiveSelect>
      </XStack>

      {/* Column Headers */}
      <XStack
        paddingHorizontal="$1.5"
        paddingVertical="$0.75"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontFamily="$interMedium" fontSize="$2" color="$gray10" minWidth={70}>
          Price
        </Text>

        <Text fontFamily="$interMedium" fontSize="$2" color="$gray10" textAlign="right" width={70}>
          Size
        </Text>
      </XStack>

      <YStack flex={1}>
        {/* Asks Section (Top) - Red theme */}
        <YStack>
          <FlatList
            data={asksWithCumulative}
            renderItem={({ item }) => renderOrderBookRow(item, 'ask')}
            keyExtractor={(item, index) => `ask-${item.px}-${index}`}
            scrollEnabled={false}
            inverted={false}
          />
        </YStack>

        {/* Last Trade Price Display */}
        <YStack
          paddingVertical="$2"
          paddingHorizontal="$1.5"
          backgroundColor="$background"
          gap="$1"
        >
          {latestPrice ? (
            <>
              {/* Last trade price - colored by trade direction */}
              <XStack justifyContent="center" alignItems="center" gap="$1.5">
                <Text
                  fontFamily="$interSemiBold"
                  fontSize="$5"
                  color={latestPrice.direction === 'buy' ? '$green10' : '$red10'}
                >
                  {formatPrice(latestPrice.price, szDecimals, true)}
                </Text>
                {latestPrice.direction === 'buy' ? (
                  <ArrowUpRight size={14} color="$green10" />
                ) : (
                  <ArrowDownRight size={14} color="$red10" />
                )}
              </XStack>

              {/* Mark price (smaller, centered, with info icon) */}
              <XStack justifyContent="center" alignItems="center" gap="$1">
                <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                  {formatPrice(markPx, szDecimals, true)}
                </Text>
                <Popover
                  size="$3"
                  allowFlip
                  placement="bottom"
                  open={markPricePopoverOpen}
                  onOpenChange={setMarkPricePopoverOpen}
                >
                  <Popover.Trigger asChild>
                    <Button
                      size="$1"
                      chromeless
                      circular
                      padding="$0.5"
                      onPress={() => setMarkPricePopoverOpen(!markPricePopoverOpen)}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Info size={12} color="$gray10" />
                    </Button>
                  </Popover.Trigger>

                  <Popover.Content
                    borderWidth={1}
                    borderColor="$borderColor"
                    backgroundColor="$background"
                    enterStyle={{ x: -10, opacity: 0 }}
                    exitStyle={{ x: -10, opacity: 0 }}
                    elevate
                    animation={[
                      'quick',
                      {
                        opacity: {
                          overshootClamping: true,
                        },
                      },
                    ]}
                  >
                    <Popover.Arrow
                      borderWidth={1}
                      borderColor="$borderColor"
                      backgroundColor="$background"
                    />
                    <YStack padding="$2" gap="$1" maxWidth={200}>
                      <Text fontSize="$3" fontFamily="$interSemiBold" color="$color">
                        Mark Price
                      </Text>
                      <Text fontSize="$2" lineHeight="$2" color="$gray11">
                        Used for margining, computing unrealized PNL, liquidations, and triggering
                        TP/SL orders
                      </Text>
                    </YStack>
                  </Popover.Content>
                </Popover>
              </XStack>
            </>
          ) : (
            // Fallback to mark price if no trades yet
            <>
              <XStack justifyContent="center">
                <Text fontFamily="$interSemiBold" fontSize="$5" color="$gray10">
                  {formatPrice(markPx, szDecimals, true)}
                </Text>
              </XStack>
              <XStack justifyContent="center" alignItems="center" gap="$1">
                <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                  Mark Price
                </Text>
                <Popover
                  size="$5"
                  allowFlip
                  placement="right"
                  open={markPricePopoverOpen}
                  onOpenChange={setMarkPricePopoverOpen}
                >
                  <Popover.Trigger asChild>
                    <Button
                      size="$1"
                      chromeless
                      circular
                      padding="$0.5"
                      onPress={() => setMarkPricePopoverOpen(!markPricePopoverOpen)}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Info size={12} color="$gray10" />
                    </Button>
                  </Popover.Trigger>

                  <Popover.Content
                    borderWidth={1}
                    borderColor="$borderColor"
                    backgroundColor="$background"
                    enterStyle={{ x: -10, opacity: 0 }}
                    exitStyle={{ x: -10, opacity: 0 }}
                    elevate
                    animation={[
                      'quick',
                      {
                        opacity: {
                          overshootClamping: true,
                        },
                      },
                    ]}
                  >
                    <Popover.Arrow
                      borderWidth={1}
                      borderColor="$borderColor"
                      backgroundColor="$background"
                    />
                    <YStack padding="$2" gap="$1" maxWidth={200}>
                      <Text fontSize="$3" fontFamily="$interSemiBold" color="$color">
                        Mark Price
                      </Text>
                      <Text fontSize="$2" lineHeight="$2" color="$gray11">
                        Used for margining, computing unrealized PNL, liquidations, and triggering
                        TP/SL orders
                      </Text>
                    </YStack>
                  </Popover.Content>
                </Popover>
              </XStack>
            </>
          )}
        </YStack>

        {/* Bids Section (Bottom) - Green theme */}
        <YStack>
          <FlatList
            data={bidsWithCumulative}
            renderItem={({ item }) => renderOrderBookRow(item, 'bid')}
            keyExtractor={(item, index) => `bid-${item.px}-${index}`}
            scrollEnabled={false}
          />
        </YStack>
      </YStack>
    </YStack>
  );
}
