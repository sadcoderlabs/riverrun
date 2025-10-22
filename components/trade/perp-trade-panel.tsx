import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import {
  ApprovalGateProvider,
  useApprovalGate,
} from '@/components/hyperliquid/ApprovalGateProvider';
import { GateButton } from '@/components/hyperliquid/GateButton';
import { LeverageAdjustmentModal } from '@/components/trade/leverage-adjustment-modal';
import {
  OrderTypeSelector,
  type OrderType,
  MarketOrderForm,
  LimitOrderForm,
  ScaleOrderForm,
} from '@/components/trade/order-forms';
import { TpSlInput } from '@/components/trade/tp-sl-input';
import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { Checkbox } from '@tamagui/checkbox';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

const AGENT_STORAGE_PREFIX = 'hl-agent:private-key:';

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

  // Mock market data (similar to what's in the index.tsx)
  const marketData = {
    assetId: assetId ?? 0,
    price: 28450.75,
    priceChange: 2.34,
    fundingRate: 0.0012,
    annualizedFunding: 10.95,
  };

  // State for the order form
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState(5);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [sizeUnit, setSizeUnit] = useState('USDC');
  const [orderSide, setOrderSide] = useState<'Long' | 'Short'>('Long');
  const [sizePercentage, setSizePercentage] = useState(0);
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [reduceOnlyEnabled, setReduceOnlyEnabled] = useState(false);

  // Order type specific states
  const [limitPrice, setLimitPrice] = useState(marketData.price.toFixed(1));
  const [scaleLowerPrice, setScaleLowerPrice] = useState(marketData.price.toFixed(1));
  const [scaleUpperPrice, setScaleUpperPrice] = useState(marketData.price.toFixed(1));
  const [scaleOrderCount, setScaleOrderCount] = useState('5');
  const [scaleSizeSkew, setScaleSizeSkew] = useState('1.0');

  // TP/SL states
  const [tpValue, setTpValue] = useState('');
  const [slValue, setSlValue] = useState('');

  const handlePlaceOrder = useCallback(
    async (context: AgentClientContext) => {
      const meta = await infoClient.meta();

      // Use the assetId directly (it's the index in Hyperliquid)
      const assetIndex = assetId ?? 0;

      if (assetIndex < 0 || assetIndex >= meta.universe.length) {
        throw new Error(`Invalid asset index: ${assetIndex}`);
      }

      const assetMeta = meta.universe[assetIndex];
      const limitPrice = '99999';
      const notionalUsd = 100;
      const sizeDecimals = assetMeta.szDecimals ?? 4;
      const baseSizeNumber = notionalUsd / Number(limitPrice);
      const baseSize = baseSizeNumber.toFixed(sizeDecimals);

      await context.agentExchangeClient.order({
        orders: [
          {
            a: assetIndex,
            b: true,
            p: limitPrice,
            s: baseSize,
            r: false,
            t: {
              limit: {
                tif: 'Gtc',
              },
            },
          },
        ],
      });
    },
    [infoClient, assetId],
  );

  // Calculate order details
  const accountBalance = 1000; // Mock account balance
  const margin = accountBalance * (sizePercentage / 100); // Margin is the amount user is willing to risk
  const leverageFactor = leverage;
  const orderSize = margin * leverageFactor; // Total position size including leverage
  const liquidationPrice =
    orderSide === 'Long'
      ? marketData.price * 0.8 // Simplified calculation for demo
      : marketData.price * 1.2;

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
          <OrderTypeSelector value={orderType} onValueChange={setOrderType} />

          {/* Long/Short Buttons */}
          <XStack gap="$2">
            <Button
              flex={1}
              backgroundColor={orderSide === 'Long' ? '$green9' : 'transparent'}
              borderColor={orderSide === 'Long' ? 'transparent' : '$gray8'}
              borderWidth={1}
              paddingVertical="$2"
              onPress={() => setOrderSide('Long')}
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
              onPress={() => setOrderSide('Short')}
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
              sizeUsd={
                sizePercentage === 0 ? '' : formatNumber(accountBalance * (sizePercentage / 100))
              }
              onSizeChange={() => {}}
            />
          )}

          {orderType === 'Limit' && (
            <LimitOrderForm
              limitPrice={limitPrice}
              onLimitPriceChange={setLimitPrice}
              sizeUsd={
                sizePercentage === 0 ? '' : formatNumber(accountBalance * (sizePercentage / 100))
              }
              onSizeChange={() => {}}
              marketPrice={marketData.price}
            />
          )}

          {orderType === 'Scale' && (
            <ScaleOrderForm
              lowerPrice={scaleLowerPrice}
              onLowerPriceChange={setScaleLowerPrice}
              upperPrice={scaleUpperPrice}
              onUpperPriceChange={setScaleUpperPrice}
              orderCount={scaleOrderCount}
              onOrderCountChange={setScaleOrderCount}
              sizeSkew={scaleSizeSkew}
              onSizeSkewChange={setScaleSizeSkew}
              sizeUsd={
                sizePercentage === 0 ? '' : formatNumber(accountBalance * (sizePercentage / 100))
              }
              onSizeChange={() => {}}
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
                onPress={() => setSizePercentage(percent)}
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
              onValueChange={values => setSizePercentage(values[0])}
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
              checked={reduceOnlyEnabled}
              onCheckedChange={checked => setReduceOnlyEnabled(checked === true)}
            >
              <Checkbox.Indicator>
                <Check />
              </Checkbox.Indicator>
            </Checkbox>
          </XStack>

          {/* Place Order Button */}
          <GateButton
            title="Place Order"
            loadingTitle="Placing..."
            buttonSize="lg"
            paddingVertical="$2.5"
            marginTop="$1"
            style={{ borderRadius: 8 }}
            disabled={!orderSide}
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
            onLeverageChange={setLeverage}
            marginMode={collateralMode}
            onMarginModeChange={setCollateralMode}
          />
        </YStack>
      </YStack>
    </XStack>
  );
}
