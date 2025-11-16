import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { FundingRate } from '@/components/trade/FundingRate';
import { useOrderForm } from '@/components/trade/hooks/useOrderForm';
import { LeverageSelector } from '@/components/trade/LeverageSelector';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { OrderBook } from '@/components/trade/OrderBook';
import { OrderPreview } from '@/components/trade/OrderPreview';
import { PositionSummary } from '@/components/trade/PositionSummary';
import {
  TpSlInput,
  type TpSlResult,
  type TpSlValidationResult,
} from '@/components/trade/TpSlInput';
import {
  useAvailableToTrade,
  useOrder,
  useOrderValue,
  useMarginRequired,
  useOrderValidation,
} from '@/core/app-internal';
import { usePositionStore } from '@/core/app-internal';
import { useMarginStore } from '@/core/app-internal';
import { useMarketStore } from '@/core/app-internal';
import { useMarkPrice, useMidPrice, useExecutionPrice } from './hooks';

import { Checkbox } from '@tamagui/checkbox';
import { Check } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner-native';
import { Button, Text, XStack, YStack } from 'tamagui';

export function PerpTradePanel() {
  const { placeOrder, isPlacingOrder } = useOrder();

  // Get selected market from store (single source of truth)
  const selectedMarket = useMarketStore(state => state.selectedMarket);
  const coin = selectedMarket?.coin || 'BTC'; // Fallback to BTC if no market selected
  const szDecimals = selectedMarket?.szDecimals || 4; // Fallback to 4 decimals

  // Subscribe to price data
  const { markPrice, isLoading: isLoadingMarkPrice } = useMarkPrice({ coin });
  const { midPrice } = useMidPrice({ coin });

  // Get real-time margin and leverage data from margin context
  const marginLeverage = useMarginStore(state => state.marginLeverage);
  const leverage = marginLeverage?.leverage ?? 1;

  // Subscribe to real-time available margin data
  const { longAvailableToTrade, shortAvailableToTrade } = useAvailableToTrade({ coin });

  // Get current position size for this coin (positive = long, negative = short)
  const currentPositionSize = usePositionStore(state => {
    const position = state.positions.find(p => p.coin === coin);
    return position ? Number(position.szi) : 0;
  });

  // Initialize React Hook Form (only manages order-specific fields)
  const { form } = useOrderForm({});

  const { setValue, control } = form;

  // Watch form values (order API parameters) - using useWatch for proper reactivity
  const orderType = useWatch({ control, name: 'orderType' });
  const orderSide = useWatch({ control, name: 'orderSide' });
  const size = useWatch({ control, name: 'size' });
  const limitPrice = useWatch({ control, name: 'limitPrice' }) || '';
  const reduceOnly = useWatch({ control, name: 'reduceOnly' });

  // Get available margin based on order side
  const availableToTrade = orderSide === 'Long' ? longAvailableToTrade : shortAvailableToTrade;

  // Calculate execution price based on order type and limit price
  const { executionPrice } = useExecutionPrice({
    orderType,
    limitPrice,
    markPrice,
  });

  // Calculate order value and margin required
  const { orderValue } = useOrderValue({ size, executionPrice });
  const { marginRequired } = useMarginRequired({ orderValue, leverage });

  // TP/SL state: stores result and validation from TpSlInput component
  const [tpSlResult, setTpSlResult] = useState<TpSlResult | undefined>(undefined);
  const [tpSlValidation, setTpSlValidation] = useState<TpSlValidationResult>({ isValid: true });

  // Validate order inputs
  const orderValidation = useOrderValidation({
    orderType,
    size,
    limitPrice,
    tpSlValidation,
  });

  // Handler for TP/SL changes
  const handleTpSlChange = useCallback(
    (result: TpSlResult | undefined, validation: TpSlValidationResult) => {
      setTpSlResult(result);
      setTpSlValidation(validation);
    },
    [],
  );

  // Handler for Place Order button
  const handlePlaceOrder = useCallback(async () => {
    // Validation - show error toast if validation fails
    if (!orderValidation.isValid) {
      toast.error(orderValidation.errorTitle || 'Invalid Order', {
        description: orderValidation.errorDescription || 'Please check your order inputs',
      });
      return;
    }

    const data = form.getValues();

    // Single unified call - tpSlResult is already calculated and validated
    await placeOrder({
      coin,
      side: data.orderSide,
      size: data.size,
      orderType: data.orderType,
      limitPrice: data.limitPrice || undefined,
      marketPrice: data.orderType === 'Market' ? markPrice : undefined,
      reduceOnly: data.reduceOnly,
      tpSl: tpSlResult,
    });
  }, [coin, form, markPrice, placeOrder, tpSlResult, orderValidation]);

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
        <FundingRate />
        <OrderBook onPriceClick={handleOrderBookPriceClick} />
      </YStack>

      {/* Right Side - Trading Panel */}
      <YStack flex={7} backgroundColor="$background">
        {/* Trading Form */}
        <YStack paddingHorizontal="$3" paddingTop="$1" paddingBottom="$3" gap="$2.5">
          {/* Leverage & Margin Type Selector */}
          <LeverageSelector />

          {/* Account & Position Summary */}
          <PositionSummary
            availableToTrade={availableToTrade}
            currentPositionSize={currentPositionSize}
            coin={coin}
            szDecimals={szDecimals}
            isLoadingAssetData={isLoadingMarkPrice}
          />

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
              markPrice={markPrice}
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
              midPrice={midPrice}
              markPrice={markPrice}
              coin={coin}
              szDecimals={szDecimals}
            />
          )}

          {/* TP/SL */}
          <TpSlInput
            entryPrice={executionPrice}
            isLong={orderSide === 'Long'}
            szDecimals={szDecimals}
            onChange={handleTpSlChange}
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
            disabled={isPlacingOrder}
            onPress={handlePlaceOrder}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text
              fontFamily="$interSemiBold"
              fontSize="$3"
              color={orderSide === 'Long' ? '$green1' : '$red1'}
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </Text>
          </Button>

          {/* Order Preview - Only show when valid inputs */}
          {orderValidation.hasValidSize && orderValidation.hasValidLimitPrice && (
            <OrderPreview orderValue={orderValue} marginRequired={marginRequired} />
          )}
        </YStack>
      </YStack>
    </XStack>
  );
}
