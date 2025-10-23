import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageAdjustmentModal } from '@/components/trade/leverage-adjustment-modal';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import { ActiveAssetData } from '@/hooks/useActiveAssetData';
import { Checkbox } from '@tamagui/checkbox';
import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner-native';
import { Button, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  assetId?: number;
  assetSymbol: string; // Asset symbol like 'BTC', 'ETH', 'SOL'
  activeAssetData?: ActiveAssetData;
  isLoadingAssetData?: boolean;
}

export function PerpTradePanel({
  assetId,
  assetSymbol,
  activeAssetData,
  isLoadingAssetData,
}: PerpTradePanelProps) {
  // Mock market data
  const marketData = {
    assetId: assetId ?? 0,
    price: 28450.75,
  };

  // Mock account balance
  const accountBalance = 1000;

  // Initialize React Hook Form (only manages order-specific fields)
  const { form, validation } = useOrderForm({});

  const { setValue, control } = form;

  // Watch form values (order API parameters) - using useWatch for proper reactivity
  const orderType = useWatch({ control, name: 'orderType' });
  const orderSide = useWatch({ control, name: 'orderSide' });
  const size = useWatch({ control, name: 'size' });
  const limitPrice = useWatch({ control, name: 'limitPrice' }) || '';
  const reduceOnly = useWatch({ control, name: 'reduceOnly' });

  // UI-only states (helper states for calculating size)
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState(5);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);

  // Update leverage and margin mode from WebSocket data
  useEffect(() => {
    if (activeAssetData?.leverage) {
      setLeverage(activeAssetData.leverage.value);
      setCollateralMode(activeAssetData.leverage.type === 'cross' ? 'Cross' : 'Isolated');
    }
  }, [activeAssetData]);

  // TP/SL states (temporarily removed from form)
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');

  // Simplified handler for Place Order button (without API call)
  const handlePlaceOrder = useCallback(() => {
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
  }, [form, validation.hasValidSize, validation.hasValidLimitPrice, assetId]);

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
            <MarketOrderForm
              size={size}
              onSizeChange={(value: string) =>
                setValue('size', value, { shouldValidate: false, shouldDirty: true })
              }
              leverage={leverage}
              accountBalance={accountBalance}
              marketPrice={marketData.price}
              assetSymbol={assetSymbol}
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
              accountBalance={accountBalance}
              marketPrice={marketData.price}
              assetSymbol={assetSymbol}
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
            onLeverageChange={setLeverage}
            marginMode={collateralMode}
            onMarginModeChange={setCollateralMode}
            assetId={assetId ?? 0}
            assetSymbol={assetSymbol}
          />
        </YStack>
      </YStack>
    </XStack>
  );
}
