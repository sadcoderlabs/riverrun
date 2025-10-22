import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import {
  ApprovalGateProvider,
  useApprovalGate,
} from '@/components/hyperliquid/ApprovalGateProvider';
import { GateButton } from '@/components/hyperliquid/GateButton';
import { useOrderForm, type OrderFormValues } from '@/components/trade/hooks/use-order-form';
import { LeverageAdjustmentModal } from '@/components/trade/leverage-adjustment-modal';
import { LimitOrderForm, MarketOrderForm, OrderTypeSelector } from '@/components/trade/order-forms';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { Checkbox } from '@tamagui/checkbox';
import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

interface PerpTradePanelProps {
  assetId?: number;
}

export function PerpTradePanel({ assetId }: PerpTradePanelProps) {
  return (
    <ApprovalGateProvider>
      <PerpTradePanelView assetId={assetId} />
    </ApprovalGateProvider>
  );
}

function PerpTradePanelView({ assetId }: PerpTradePanelProps) {
  const { infoClient } = useApprovalGate();

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

  // Actual order placement logic
  const placeOrder = useCallback(
    async (data: OrderFormValues, context: AgentClientContext) => {
      try {
        const meta = await infoClient.meta();
        const assetIndex = assetId ?? 0;

        if (assetIndex < 0 || assetIndex >= meta.universe.length) {
          throw new Error(`Invalid asset index: ${assetIndex}`);
        }

        const assetMeta = meta.universe[assetIndex];
        const sizeDecimals = assetMeta.szDecimals ?? 4;

        // Use size from form data (in base asset units)
        // Format it to match the required decimals
        const formattedSize = parseFloat(data.size).toFixed(sizeDecimals);

        await context.agentExchangeClient.order({
          orders: [
            {
              a: assetIndex,
              b: data.orderSide === 'Long',
              p: data.orderType === 'Limit' ? data.limitPrice : marketData.price.toString(),
              s: formattedSize,
              r: data.reduceOnly,
              t: {
                limit: {
                  tif: 'Gtc',
                },
              },
            },
          ],
        });

        toast.success('Order Placed', {
          description: `${data.orderSide} ${data.size} @ ${data.orderType === 'Limit' ? data.limitPrice : marketData.price}`,
        });
      } catch (error) {
        toast.error('Order Failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    [infoClient, assetId, marketData.price],
  );

  // Handler for Place Order button (with context)
  const handlePlaceOrder = useCallback(
    async (context: AgentClientContext) => {
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

      await placeOrder(data, context);
    },
    [form, validation.hasSizeZero, validation.hasInvalidLimitPrice, placeOrder],
  );

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
          <GateButton
            title={validation.buttonText}
            loadingTitle="Placing..."
            buttonSize="lg"
            paddingVertical="$2.5"
            marginTop="$1"
            style={{ borderRadius: 8 }}
            disabled={validation.buttonDisabled}
            onPressApproved={async context => {
              try {
                await handlePlaceOrder(context);
              } catch (error) {
                console.error('Failed to place order via agent', error);
                throw error;
              }
            }}
          />

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
