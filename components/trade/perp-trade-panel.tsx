import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageSelector } from '@/components/trade/leverage-selector';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { OrderBook } from '@/components/trade/OrderBook';
import { roundPrice } from '@/components/trade/price-utils';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
import { Checkbox } from '@tamagui/checkbox';
import { Check } from '@tamagui/lucide-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner-native';
import { Button, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  coin: string; // Asset symbol like 'BTC', 'ETH', 'SOL'
}

export function PerpTradePanel({ coin }: PerpTradePanelProps) {
  const { getSymbolConverter, getAgentExchangeClient } = useHyperliquidClient();

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin,
  });

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

  // TP/SL states (temporarily removed from form)
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');

  // Loading state for placing orders
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Handler for Place Order button
  const handlePlaceOrder = useCallback(async () => {
    if (isPlacingOrder) return;

    const data = form.getValues();

    // Check if size is valid
    if (!validation.hasValidSize) {
      toast.error('Size Required', {
        description: 'Please enter an order size',
      });
      return;
    }

    // Check if limit price is valid for Limit orders
    if (!validation.hasValidLimitPrice) {
      toast.error('Invalid Price', {
        description: 'Please enter a valid limit price',
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Get ExchangeClient
      const exchangeClient = await getAgentExchangeClient();
      if (!exchangeClient) {
        // User cancelled signing
        toast.info('Cancelled', {
          description: 'Order placement was cancelled',
        });
        return;
      }

      // Get assetId from coin symbol
      const converter = await getSymbolConverter();
      const assetId = converter.getAssetId(coin);

      if (assetId === undefined) {
        toast.error('Invalid Asset', {
          description: `Unable to find asset ID for ${coin}`,
        });
        return;
      }

      // Get szDecimals for the asset to properly round the size
      const assetSzDecimals = converter.getSzDecimals(coin);
      if (assetSzDecimals === undefined) {
        toast.error('Invalid Asset', {
          description: `Unable to find size decimals for ${coin}`,
        });
        return;
      }

      // Round size to the required decimal places for this asset
      const rawSize = parseFloat(data.size);
      const roundedSize = rawSize.toFixed(assetSzDecimals);

      // Calculate price based on order type
      const isLong = data.orderSide === 'Long';
      let price: string;

      if (data.orderType === 'Market') {
        // Market order: use extreme price to ensure immediate execution
        // Buy: price above market, Sell: price below market
        const extremePrice = isLong
          ? marketPrice * 1.05 // 5% above market for buys
          : marketPrice * 0.95; // 5% below market for sells
        // Round the price according to Hyperliquid rules
        price = roundPrice(extremePrice, assetSzDecimals, false);
      } else {
        // Limit order: use user-specified price (no rounding)
        price = data.limitPrice || '0';
      }

      // Prepare order parameters
      // Size is rounded here before submitting, price is user-specified
      const orderParams = {
        a: assetId, // asset ID
        b: isLong, // true for long (buy), false for short (sell)
        p: price, // price (user-specified, not rounded)
        s: roundedSize, // size (rounded to szDecimals)
        r: data.reduceOnly, // reduce-only
        t:
          data.orderType === 'Market'
            ? { limit: { tif: 'Ioc' as const } } // Market order: Immediate-Or-Cancel
            : { limit: { tif: 'Gtc' as const } }, // Limit order: Good-Till-Cancel
      };

      // Place the order
      const response = await exchangeClient.order({
        orders: [orderParams],
        grouping: 'na',
      });

      console.log('[handlePlaceOrder] Order response:', response);

      // Check if response contains errors
      if (response.response.data.statuses && response.response.data.statuses.length > 0) {
        const status = response.response.data.statuses[0];

        // Check if the status contains an error
        if ('error' in status && typeof status.error === 'string') {
          toast.error('Order Failed', {
            description: status.error,
          });
          return;
        }
      }

      // Show success toast
      toast.success('Order Placed', {
        description: `${data.orderType} ${data.orderSide} order for ${data.size} ${coin}`,
      });

      // WebSocket will automatically update the orders list
    } catch (err) {
      console.error('[handlePlaceOrder] Error placing order:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error('Order Failed', {
        description: errorMessage,
      });
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    coin,
    form,
    validation.hasValidLimitPrice,
    validation.hasValidSize,
    isPlacingOrder,
    marketPrice,
  ]);

  // Format number with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  return (
    <XStack>
      {/* Left Side - Order Book */}
      <YStack flex={5} backgroundColor="$background" borderRightWidth={1} borderRightColor="$gray8">
        <OrderBook coin={coin} />
      </YStack>

      {/* Right Side - Trading Panel */}
      <YStack flex={7} backgroundColor="$background">
        {/* Trading Form */}
        <YStack padding="$3" gap="$2.5">
          {/* Leverage & Margin Type Selector */}
          <LeverageSelector leverage={leverage} marginMode={marginMode} coin={coin} />

          {/* Available to Trade */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Available to trade
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
              {isLoadingAssetData ? (
                <Text color="$gray10">Loading...</Text>
              ) : (
                `$${formatNumber(availableToTrade)}`
              )}
            </Text>
          </XStack>

          {/* Current Position */}
          <YStack gap="$0.5">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Current Position
            </Text>
          </YStack>

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
            enabled={tpSlEnabled}
            onEnabledChange={setTpSlEnabled}
            tpValue={tpValue}
            onTpValueChange={setTpValue}
            slValue={slValue}
            onSlValueChange={setSlValue}
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
