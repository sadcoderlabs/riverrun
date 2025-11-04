import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageSelector } from '@/components/trade/leverage-selector';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { OrderBook } from '@/components/trade/OrderBook';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import {
  useActiveAssetData,
  useHyperliquidClient,
  useOrder,
  useWebData2,
} from '@/lib/hyperliquid/hooks';
import {
  calculateSlPercentFromPrice,
  calculateSlPriceFromPercent,
  calculateTpPercentFromPrice,
  calculateTpPriceFromPercent,
  validateSlPrice,
  validateTpPrice,
} from '@/lib/hyperliquid/utils/tpsl-utils';

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
  const { getSymbolConverter } = useHyperliquidClient();
  const { placeMarketOrder, placeLimitOrder, placeOrderWithTpSl, isPlacingOrder } = useOrder();

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

  // TP/SL states
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [tpUnit, setTpUnit] = useState<'USD' | '%'>('%');
  const [slValue, setSlValue] = useState('');
  const [slUnit, setSlUnit] = useState<'USD' | '%'>('%');

  // Get entry price for TP/SL calculations
  const entryPriceForTpSl = useMemo(() => {
    if (orderType === 'Market') {
      return marketPrice;
    } else {
      const limit = parseFloat(limitPrice || '0');
      return limit > 0 ? limit : marketPrice;
    }
  }, [orderType, marketPrice, limitPrice]);

  // TP/SL handlers with bidirectional conversion
  const handleTpValueChange = useCallback((value: string) => {
    setTpValue(value);
  }, []);

  const handleTpUnitChange = useCallback(
    (newUnit: 'USD' | '%') => {
      // Convert existing value to new unit
      if (tpValue && entryPriceForTpSl > 0) {
        const currentValue = parseFloat(tpValue);
        if (isFinite(currentValue)) {
          let convertedValue: string;
          if (newUnit === '%' && tpUnit === 'USD') {
            // USD → %
            convertedValue = calculateTpPercentFromPrice(
              entryPriceForTpSl,
              currentValue,
              orderSide === 'Long',
            );
          } else if (newUnit === 'USD' && tpUnit === '%') {
            // % → USD
            convertedValue = calculateTpPriceFromPercent(
              entryPriceForTpSl,
              currentValue,
              orderSide === 'Long',
              szDecimals,
            );
          } else {
            convertedValue = tpValue;
          }
          setTpValue(convertedValue);
        }
      }
      setTpUnit(newUnit);
    },
    [tpValue, tpUnit, entryPriceForTpSl, orderSide, szDecimals],
  );

  const handleSlValueChange = useCallback((value: string) => {
    setSlValue(value);
  }, []);

  const handleSlUnitChange = useCallback(
    (newUnit: 'USD' | '%') => {
      // Convert existing value to new unit
      if (slValue && entryPriceForTpSl > 0) {
        const currentValue = parseFloat(slValue);
        if (isFinite(currentValue)) {
          let convertedValue: string;
          if (newUnit === '%' && slUnit === 'USD') {
            // USD → %
            convertedValue = calculateSlPercentFromPrice(
              entryPriceForTpSl,
              currentValue,
              orderSide === 'Long',
            );
          } else if (newUnit === 'USD' && slUnit === '%') {
            // % → USD
            convertedValue = calculateSlPriceFromPercent(
              entryPriceForTpSl,
              currentValue,
              orderSide === 'Long',
              szDecimals,
            );
          } else {
            convertedValue = slValue;
          }
          setSlValue(convertedValue);
        }
      }
      setSlUnit(newUnit);
    },
    [slValue, slUnit, entryPriceForTpSl, orderSide, szDecimals],
  );

  // Handler for Place Order button
  const handlePlaceOrder = useCallback(async () => {
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

    const isLong = data.orderSide === 'Long';

    // If TP/SL is enabled, use atomic order placement
    if (tpSlEnabled && (tpValue || slValue)) {
      // Calculate trigger prices from user input
      let tpTriggerPrice: string | undefined;
      let slTriggerPrice: string | undefined;

      const entryPrice = entryPriceForTpSl;

      // Process TP
      if (tpValue) {
        const tpNum = parseFloat(tpValue);
        if (isFinite(tpNum) && tpNum > 0) {
          // Convert to price if in percentage mode
          if (tpUnit === '%') {
            tpTriggerPrice = calculateTpPriceFromPercent(entryPrice, tpNum, isLong, szDecimals);
          } else {
            tpTriggerPrice = tpValue;
          }

          // Validate TP price
          const tpValid = validateTpPrice(tpTriggerPrice, entryPrice, isLong);
          if (!tpValid.valid) {
            toast.error('Invalid TP', {
              description: tpValid.error,
            });
            return;
          }
        }
      }

      // Process SL
      if (slValue) {
        const slNum = parseFloat(slValue);
        if (isFinite(slNum) && slNum > 0) {
          // Convert to price if in percentage mode
          if (slUnit === '%') {
            slTriggerPrice = calculateSlPriceFromPercent(entryPrice, slNum, isLong, szDecimals);
          } else {
            slTriggerPrice = slValue;
          }

          // Validate SL price
          const slValid = validateSlPrice(slTriggerPrice, entryPrice, isLong);
          if (!slValid.valid) {
            toast.error('Invalid SL', {
              description: slValid.error,
            });
            return;
          }
        }
      }

      // Place atomic order with TP/SL
      const orderSuccess = await placeOrderWithTpSl({
        coin,
        side: data.orderSide,
        size: data.size,
        orderType: data.orderType,
        limitPrice: data.limitPrice || undefined,
        marketPrice: data.orderType === 'Market' ? marketPrice : undefined,
        reduceOnly: data.reduceOnly,
        tpTriggerPrice,
        slTriggerPrice,
      });

      // Reset TP/SL inputs after successful placement
      if (orderSuccess) {
        setTpSlEnabled(false);
        setTpValue('');
        setSlValue('');
      }
    } else {
      // No TP/SL - use regular order placement
      if (data.orderType === 'Market') {
        await placeMarketOrder({
          coin,
          side: data.orderSide,
          size: data.size,
          reduceOnly: data.reduceOnly,
          marketPrice,
        });
      } else {
        await placeLimitOrder({
          coin,
          side: data.orderSide,
          size: data.size,
          limitPrice: data.limitPrice || '0',
          reduceOnly: data.reduceOnly,
        });
      }
    }
  }, [
    coin,
    form,
    validation.hasValidSize,
    validation.hasValidLimitPrice,
    marketPrice,
    placeMarketOrder,
    placeLimitOrder,
    placeOrderWithTpSl,
    tpSlEnabled,
    tpValue,
    tpUnit,
    slValue,
    slUnit,
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
            enabled={tpSlEnabled}
            onEnabledChange={setTpSlEnabled}
            tpValue={tpValue}
            onTpValueChange={handleTpValueChange}
            tpUnit={tpUnit}
            onTpUnitChange={handleTpUnitChange}
            slValue={slValue}
            onSlValueChange={handleSlValueChange}
            slUnit={slUnit}
            onSlUnitChange={handleSlUnitChange}
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
