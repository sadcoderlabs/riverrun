import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageSelector } from '@/components/trade/leverage-selector';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { OrderBook } from '@/components/trade/OrderBook';
import { TpSlInput, type TpSlInputRef } from '@/components/trade/tp-sl-input';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import {
  useActiveAssetData,
  useHyperliquidClient,
  useOrder,
  useWebData2,
} from '@/lib/hyperliquid/hooks';
import { calculateTpSlPrices, validateTpSl } from '@/lib/hyperliquid/utils/order-utils';

import { Checkbox } from '@tamagui/checkbox';
import { Check } from '@tamagui/lucide-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner-native';
import { Button, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  coin: string; // Asset symbol like 'BTC', 'ETH', 'SOL'
}

export function PerpTradePanel({ coin }: PerpTradePanelProps) {
  const { getSymbolConverter } = useHyperliquidClient();
  const { placeOrder, isPlacingOrder } = useOrder();

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin,
  });

  // Subscribe to WebData2 to get position data
  const { data: webData } = useWebData2();

  // Get szDecimals for the asset
  const [szDecimals, setSzDecimals] = useState<number>(4); // Default to 4 decimals

  useEffect(() => {
    const fetchSzDecimals = async () => {
      const converter = await getSymbolConverter();
      const decimals = converter.getSzDecimals(coin);
      if (decimals !== undefined) {
        setSzDecimals(decimals);
      }
    };
    fetchSzDecimals();
  }, [coin, getSymbolConverter]);

  // Initialize React Hook Form (only manages order-specific fields)
  const { form, validation } = useOrderForm({});

  const { setValue, control } = form;

  // Watch form values (order API parameters) - using useWatch for proper reactivity
  const orderType = useWatch({ control, name: 'orderType' });
  const orderSide = useWatch({ control, name: 'orderSide' });
  const size = useWatch({ control, name: 'size' });
  const limitPrice = useWatch({ control, name: 'limitPrice' }) || '';
  const reduceOnly = useWatch({ control, name: 'reduceOnly' });

  // Calculate available to trade based on order side
  // availableToTrade[0] = long (buy) available margin
  // availableToTrade[1] = short (sell) available margin
  const availableToTrade =
    orderSide === 'Long'
      ? parseFloat(activeAssetData?.availableToTrade[0] || '0')
      : parseFloat(activeAssetData?.availableToTrade[1] || '0');

  // Get leverage and margin mode directly from activeAssetData
  const leverage = activeAssetData?.leverage?.value ?? 5;
  const marginMode = activeAssetData?.leverage?.type === 'cross' ? 'Cross' : 'Isolated';

  // Memoize marketPrice to prevent unnecessary re-renders when markPx updates
  // This stabilizes the price used for size calculations
  const marketPrice = useMemo(
    () => parseFloat(activeAssetData?.markPx || '0'),
    [activeAssetData?.markPx],
  );

  // TP/SL ref to access internal state
  const tpSlRef = useRef<TpSlInputRef>(null);

  // Get entry price for TP/SL calculations
  const entryPriceForTpSl = useMemo(() => {
    if (orderType === 'Market') {
      return marketPrice;
    } else {
      const limit = parseFloat(limitPrice || '0');
      return limit > 0 ? limit : marketPrice;
    }
  }, [orderType, marketPrice, limitPrice]);

  // Handler for Place Order button
  const handlePlaceOrder = useCallback(async () => {
    const data = form.getValues();

    // Validation
    if (!validation.hasValidSize) {
      toast.error('Size Required', {
        description: 'Please enter an order size',
      });
      return;
    }

    if (!validation.hasValidLimitPrice) {
      toast.error('Invalid Price', {
        description: 'Please enter a valid limit price',
      });
      return;
    }

    const isLong = data.orderSide === 'Long';

    // Get TP/SL configuration from component
    const tpSlConfig = tpSlRef.current?.getConfig();
    let tpSl: { tpTriggerPrice?: string; slTriggerPrice?: string } | undefined;

    if (tpSlConfig?.enabled && (tpSlConfig.tpValue || tpSlConfig.slValue)) {
      tpSl = calculateTpSlPrices({
        tpValue: tpSlConfig.tpValue,
        tpUnit: tpSlConfig.tpUnit,
        slValue: tpSlConfig.slValue,
        slUnit: tpSlConfig.slUnit,
        entryPrice: entryPriceForTpSl,
        isLong,
        szDecimals,
      });

      // Validate TP/SL
      const validation = validateTpSl(tpSl, entryPriceForTpSl, isLong);
      if (!validation.valid && validation.error) {
        toast.error(validation.error.title, {
          description: validation.error.description,
        });
        return;
      }
    }

    // Single unified call
    const orderSuccess = await placeOrder({
      coin,
      side: data.orderSide,
      size: data.size,
      orderType: data.orderType,
      limitPrice: data.limitPrice || undefined,
      marketPrice: data.orderType === 'Market' ? marketPrice : undefined,
      reduceOnly: data.reduceOnly,
      tpSl,
    });

    // Reset TP/SL inputs after successful placement
    if (orderSuccess && tpSlConfig?.enabled) {
      tpSlRef.current?.reset();
    }
  }, [
    coin,
    form,
    validation.hasValidSize,
    validation.hasValidLimitPrice,
    marketPrice,
    placeOrder,
    entryPriceForTpSl,
    szDecimals,
  ]);

  // Get current position for this coin
  const currentPosition = useMemo(() => {
    if (!webData?.clearinghouseState?.assetPositions) {
      return null;
    }

    const position = webData.clearinghouseState.assetPositions.find(
      asset => asset.position.coin === coin,
    );

    if (!position || Number(position.position.szi) === 0) {
      return null;
    }

    return position.position;
  }, [webData, coin]);

  // Handle order book price click - update limit price when in Limit order mode
  const handleOrderBookPriceClick = useCallback(
    (price: string) => {
      // Only update limit price when in Limit order mode
      if (orderType === 'Limit') {
        setValue('limitPrice', price);
      }
    },
    [orderType, setValue],
  );

  return (
    <XStack borderWidth={0}>
      {/* Left Side - Order Book */}
      <YStack flex={5} backgroundColor="$background" borderWidth={0}>
        <OrderBook
          coin={coin}
          szDecimals={szDecimals}
          markPx={activeAssetData?.markPx || '0'}
          onPriceClick={handleOrderBookPriceClick}
        />
      </YStack>

      {/* Right Side - Trading Panel */}
      <YStack flex={7} backgroundColor="$background">
        {/* Trading Form */}
        <YStack paddingHorizontal="$3" paddingTop="$1" paddingBottom="$3" gap="$2.5">
          {/* Leverage & Margin Type Selector */}
          <LeverageSelector leverage={leverage} marginMode={marginMode} coin={coin} />

          {/* Available to Trade */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Available to trade
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
              {isLoadingAssetData ? (
                <Text color="$gray10">Loading...</Text>
              ) : (
                `$${formatValue(availableToTrade, 2)}`
              )}
            </Text>
          </XStack>

          {/* Current Position */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Current Position
            </Text>
            <Text
              fontFamily="$interSemiBold"
              fontSize="$3"
              color={
                currentPosition
                  ? Number(currentPosition.szi) > 0
                    ? '$green10'
                    : '$red10'
                  : '$color'
              }
            >
              {currentPosition
                ? `${formatSize(Math.abs(Number(currentPosition.szi)), szDecimals, false)} ${coin}`
                : `0 ${coin}`}
            </Text>
          </XStack>

          {/* Order Type Selector */}
          <OrderTypeSelector
            value={orderType}
            onValueChange={value => setValue('orderType', value as any)}
          />

          {/* Long/Short Buttons */}
          <XStack gap="$2">
            <Button
              flex={1}
              backgroundColor={orderSide === 'Long' ? '$green9' : 'transparent'}
              borderColor={orderSide === 'Long' ? 'transparent' : '$gray8'}
              borderWidth={1}
              paddingVertical="$2"
              onPress={() => setValue('orderSide', 'Long')}
              borderRadius="$3"
              height="$3"
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={orderSide === 'Long' ? '$green1' : '$color'}
              >
                LONG
              </Text>
            </Button>

            <Button
              flex={1}
              backgroundColor={orderSide === 'Short' ? '$red9' : 'transparent'}
              borderColor={orderSide === 'Short' ? 'transparent' : '$gray8'}
              borderWidth={1}
              paddingVertical="$2"
              onPress={() => setValue('orderSide', 'Short')}
              borderRadius="$3"
              height="$3"
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={orderSide === 'Short' ? '$red1' : '$color'}
              >
                SHORT
              </Text>
            </Button>
          </XStack>

          {/* Order Type Specific Forms */}
          {orderType === 'Market' && (
            <MarketOrderForm
              size={size}
              onSizeChange={(value: string) =>
                setValue('size', value, { shouldValidate: false, shouldDirty: true })
              }
              leverage={leverage}
              availableToTrade={availableToTrade}
              marketPrice={marketPrice}
              coin={coin}
              szDecimals={szDecimals}
            />
          )}

          {orderType === 'Limit' && (
            <LimitOrderForm
              limitPrice={limitPrice}
              onLimitPriceChange={(value: string) => setValue('limitPrice', value)}
              size={size}
              onSizeChange={(value: string) =>
                setValue('size', value, { shouldValidate: false, shouldDirty: true })
              }
              leverage={leverage}
              availableToTrade={availableToTrade}
              marketPrice={marketPrice}
              coin={coin}
              szDecimals={szDecimals}
            />
          )}

          {/* TP/SL */}
          <TpSlInput
            ref={tpSlRef}
            entryPrice={entryPriceForTpSl}
            isLong={orderSide === 'Long'}
            szDecimals={szDecimals}
          />

          {/* Reduce-Only */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$interRegular" fontSize="$2" color="$color">
              Reduce-Only
            </Text>
            <Checkbox
              size="$4"
              checked={reduceOnly}
              onCheckedChange={checked => setValue('reduceOnly', checked === true)}
            >
              <Checkbox.Indicator>
                <Check />
              </Checkbox.Indicator>
            </Checkbox>
          </XStack>

          {/* Place Order Button */}
          <Button
            backgroundColor={orderSide === 'Long' ? '$green9' : '$red9'}
            paddingVertical="$2.5"
            marginTop="$1"
            borderRadius="$3"
            disabled={validation.buttonDisabled || isPlacingOrder}
            onPress={handlePlaceOrder}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text
              fontFamily="$interSemiBold"
              fontSize="$3"
              color={orderSide === 'Long' ? '$green1' : '$red1'}
            >
              {isPlacingOrder ? 'Placing Order...' : validation.buttonText}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </XStack>
  );
}
