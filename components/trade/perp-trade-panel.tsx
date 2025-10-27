import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { useOrderForm } from '@/components/trade/hooks/use-order-form';
import { LeverageSelector } from '@/components/trade/leverage-selector';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
import { Checkbox } from '@tamagui/checkbox';
import { Check } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';
import { Button, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  coin: string; // Asset symbol like 'BTC', 'ETH', 'SOL'
}

export function PerpTradePanel({ coin }: PerpTradePanelProps) {
  const { getSymbolConverter } = useHyperliquidClient();

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin,
  });

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

  // TP/SL states (temporarily removed from form)
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');

  // Simplified handler for Place Order button (without API call)
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

    // Get assetId from coin symbol
    const converter = await getSymbolConverter();
    const assetId = converter.getAssetId(coin);

    if (assetId === undefined) {
      toast.error('Invalid Asset', {
        description: `Unable to find asset ID for ${coin}`,
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
      assetId,
    };

    // Show order data in alert
    Alert.alert('Order Data', JSON.stringify(orderData, null, 2));
  }, [coin, form, getSymbolConverter, validation.hasValidLimitPrice, validation.hasValidSize]);

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
              marketPrice={parseFloat(activeAssetData?.markPx || '0')}
              coin={coin}
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
              marketPrice={parseFloat(activeAssetData?.markPx || '0')}
              coin={coin}
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
        </YStack>
      </YStack>
    </XStack>
  );
}
