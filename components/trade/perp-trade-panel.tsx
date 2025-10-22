import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageAdjustmentModal } from '@/components/trade/leverage-adjustment-modal';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import { Checkbox } from '@tamagui/checkbox';
import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  assetId?: number;
}

export function PerpTradePanel({ assetId }: PerpTradePanelProps) {
  // Mock market data
  const marketData = {
    assetId: assetId ?? 0,
    price: 28450.75,
  };

  // Mock account balance
  const accountBalance = 1000;

  // Initialize React Hook Form (only manages order-specific fields)
  const { form, validation } = useOrderForm({});

  const { setValue, watch } = form;

  // Watch form values (order API parameters)
  const orderType = watch('orderType');
  const orderSide = watch('orderSide');
  const size = watch('size');
  const limitPrice = watch('limitPrice') || '';
  const reduceOnly = watch('reduceOnly');

  // UI-only states (helper states for calculating size)
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState(5);
  const [sizePercentage, setSizePercentage] = useState(0);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);

  // TP/SL states (temporarily removed from form)
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');

  // Simplified handler for Place Order button (without API call)
  const handlePlaceOrder = useCallback(() => {
    const data = form.getValues();

    // Check if size is zero
    if (validation.hasSizeZero) {
      toast.error('Size Required', {
        description: 'Please enter an order size',
      });
      return;
    }

    // Check if limit price is invalid for Limit orders
    if (validation.hasInvalidLimitPrice) {
      toast.error('Invalid Price', {
        description: 'Please enter a valid limit price',
      });
      return;
    }

    // Prepare order data for display
    const orderData = {
      orderType: data.orderType,
      orderSide: data.orderSide,
      size: data.size,
      ...(data.orderType === 'Limit' && { limitPrice: data.limitPrice }),
      reduceOnly: data.reduceOnly,
      assetId: assetId ?? 0,
    };

    // Show order data in alert
    Alert.alert('Order Data', JSON.stringify(orderData, null, 2));
  }, [form, validation.hasSizeZero, validation.hasInvalidLimitPrice, assetId]);

  // Format number with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  return (
    <XStack>
      {/* Left Side - Order Book Placeholder */}
      <YStack flex={5} backgroundColor="$background" borderRightWidth={1} borderRightColor="$gray8">
        <YStack justifyContent="center" alignItems="center" padding="$4" minHeight={200}>
          <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
            Order Book
          </Text>
        </YStack>
      </YStack>

      {/* Right Side - Trading Panel */}
      <YStack flex={7} backgroundColor="$background">
        {/* Trading Form */}
        <YStack padding="$3" gap="$2.5">
          {/* Leverage & Margin Type Selector Button */}
          <XStack
            backgroundColor="$gray3"
            borderRadius="$3"
            paddingVertical="$2"
            paddingHorizontal="$2.5"
            borderColor="$gray8"
            borderWidth={1}
            alignItems="center"
            justifyContent="space-between"
            onPress={() => setLeverageSheetOpen(true)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text color="$color" fontSize="$2" fontFamily="$interRegular">
              {leverage}x {collateralMode.toUpperCase()}
            </Text>
            <ChevronDown size="$0.75" color="$color" />
          </XStack>

          {/* Available Balance */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Available
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
              ${formatNumber(accountBalance)}
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
            <MarketOrderForm size={size} onSizeChange={value => setValue('size', value)} />
          )}

          {orderType === 'Limit' && (
            <LimitOrderForm
              limitPrice={limitPrice}
              onLimitPriceChange={value => setValue('limitPrice', value)}
              size={size}
              onSizeChange={value => setValue('size', value)}
              marketPrice={marketData.price}
            />
          )}

          {/* Percentage Buttons */}
          <XStack gap="$1.5" justifyContent="space-between">
            {[25, 50, 75, 100].map(percent => (
              <Button
                key={percent}
                flex={1}
                backgroundColor="$gray5"
                borderRadius="$3"
                paddingVertical="$2"
                paddingHorizontal="$1"
                onPress={() => {
                  setSizePercentage(percent);
                  // Calculate and set size in base asset units
                  const marginUsd = accountBalance * (percent / 100);
                  const sizeUsd = marginUsd * leverage;
                  const sizeInBaseAsset = sizeUsd / marketData.price;
                  setValue('size', sizeInBaseAsset.toFixed(4));
                }}
                opacity={sizePercentage === percent ? 1 : 0.6}
              >
                <Text fontFamily="$interRegular" fontSize="$2" color="$color">
                  {percent}%
                </Text>
              </Button>
            ))}
          </XStack>

          {/* Size Slider */}
          <YStack gap="$1.5">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontFamily="$interRegular" fontSize="$2" color="$color">
                {sizePercentage === 0 ? '0' : Math.round(sizePercentage)}%
              </Text>
            </XStack>
            <Slider
              value={[sizePercentage]}
              max={100}
              step={1}
              onValueChange={values => {
                setSizePercentage(values[0]);
                // Calculate and set size in base asset units
                const marginUsd = accountBalance * (values[0] / 100);
                const sizeUsd = marginUsd * leverage;
                const sizeInBaseAsset = sizeUsd / marketData.price;
                setValue('size', sizeInBaseAsset.toFixed(4));
              }}
            >
              <Slider.Track backgroundColor="$gray5" height="$0.5">
                <Slider.TrackActive backgroundColor="$accent9" />
              </Slider.Track>
              <Slider.Thumb
                index={0}
                size="$0.75"
                backgroundColor="$accent1"
                borderWidth={1}
                borderColor="$accent9"
                circular
              />
            </Slider>
          </YStack>

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
            disabled={validation.buttonDisabled}
            onPress={handlePlaceOrder}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text
              fontFamily="$interSemiBold"
              fontSize="$3"
              color={orderSide === 'Long' ? '$green1' : '$red1'}
            >
              {validation.buttonText}
            </Text>
          </Button>

          <LeverageAdjustmentModal
            open={leverageSheetOpen}
            onOpenChange={setLeverageSheetOpen}
            leverage={leverage}
            onLeverageChange={value => {
              setLeverage(value);
              // Recalculate size when leverage changes
              if (sizePercentage > 0) {
                const marginUsd = accountBalance * (sizePercentage / 100);
                const sizeUsd = marginUsd * value;
                const sizeInBaseAsset = sizeUsd / marketData.price;
                setValue('size', sizeInBaseAsset.toFixed(4));
              }
            }}
            marginMode={collateralMode}
            onMarginModeChange={setCollateralMode}
          />
        </YStack>
      </YStack>
    </XStack>
  );
}
