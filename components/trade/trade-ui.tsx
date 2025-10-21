import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { OrdersTabContent } from '@/components/trade/orders-tab';
import PositionsTab from '@/components/trade/positions-tab';
import AdaptiveSelect from '@/components/global/adaptive-select';
import {
  ApprovalGateProvider,
  useApprovalGate,
} from '@/components/hyperliquid/ApprovalGateProvider';
import { GateButton } from '@/components/hyperliquid/GateButton';
import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { findAssetIndex, parseMarketId } from '@/lib/hyperliquid/market-utils';
import { ChevronDown } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { Button, Checkbox, ScrollView, Sheet, Slider, Text, XStack, YStack } from 'tamagui';

const AGENT_STORAGE_PREFIX = 'hl-agent:private-key:';
const LEVERAGE_MIN = 1;
const LEVERAGE_MAX = 20;
const LEVERAGE_STEP = 1;

interface TradeUIProps {
  marketId?: string;
}

export function TradeUI({ marketId }: TradeUIProps) {
  return (
    <ApprovalGateProvider>
      <TradeUIView marketId={marketId} />
    </ApprovalGateProvider>
  );
}

function TradeUIView({ marketId }: TradeUIProps) {
  const { infoClient } = useApprovalGate();

  // Mock market data (similar to what's in the index.tsx)
  const marketData = {
    id: marketId || 'BTC-USD',
    price: 28450.75,
    priceChange: 2.34,
    fundingRate: 0.0012,
    annualizedFunding: 10.95,
  };

  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('orders');

  // State for the order form
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState(5);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);
  const [leverageSheetPosition, setLeverageSheetPosition] = useState(0);
  const [orderType, setOrderType] = useState('Market');
  const [sizeUnit, setSizeUnit] = useState('USDC');
  const [orderSide, setOrderSide] = useState<'Long' | 'Short'>('Long');
  const [sizePercentage, setSizePercentage] = useState(0);
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [reduceOnlyEnabled, setReduceOnlyEnabled] = useState(false);

  const handlePlaceOrder = useCallback(
    async (context: AgentClientContext) => {
      const meta = await infoClient.meta();

      // Parse marketId (e.g., "BTC-USD") to get the asset name (e.g., "BTC")
      const { assetName } = parseMarketId(marketId || 'BTC-USD');

      // Find the asset index in the universe
      const assetIndex = findAssetIndex(assetName, meta.universe);

      if (assetIndex === -1) {
        throw new Error(`Unable to locate ${assetName} perpetual market metadata`);
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
    [infoClient, marketId],
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
    <ScrollView flex={1}>
      <YStack>
        {/* Main Content - Split Layout */}
        <XStack>
          {/* Left Side - Order Book Placeholder */}
          <YStack
            flex={5}
            backgroundColor="$background"
            borderRightWidth={1}
            borderRightColor="$gray8"
          >
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
              {/* Leverage & Margin Type Combined Selector */}
              <SelectBox
                title="Leverage & Margin"
                value={`${leverage}x ${collateralMode}`}
                onValueChange={value => {
                  const [lev, margin] = value.split(' ');
                  setLeverage(Number(lev.replace('x', '')));
                  setCollateralMode(margin);
                }}
                items={[
                  { value: '1x Cross', label: '1x CROSS' },
                  { value: '5x Cross', label: '5x CROSS' },
                  { value: '10x Cross', label: '10x CROSS' },
                  { value: '15x Cross', label: '15x CROSS' },
                  { value: '20x Cross', label: '20x CROSS' },
                  { value: '1x Isolated', label: '1x ISOLATED' },
                  { value: '5x Isolated', label: '5x ISOLATED' },
                  { value: '10x Isolated', label: '10x ISOLATED' },
                  { value: '15x Isolated', label: '15x ISOLATED' },
                  { value: '20x Isolated', label: '20x ISOLATED' },
                ]}
                placeholder="15x CROSS"
              />

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
              <SelectBox
                title="Order Type"
                value={orderType}
                onValueChange={setOrderType}
                items={[
                  { value: 'Limit', label: 'Limit' },
                  { value: 'Market', label: 'Market' },
                ]}
                placeholder="Limit"
              />

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

              {/* Limit Price */}
              <YStack gap="$1.5">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                    Limit Price
                  </Text>
                  <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                    Mid
                  </Text>
                </XStack>
                <XStack
                  backgroundColor="$gray3"
                  borderRadius="$3"
                  paddingVertical="$2"
                  paddingHorizontal="$2.5"
                  borderColor="$gray8"
                  borderWidth={1}
                >
                  <Text fontFamily="$interRegular" fontSize="$3" color="$color">
                    {marketData.price.toFixed(1)}
                  </Text>
                </XStack>
              </YStack>

              {/* Size (USD) */}
              <YStack gap="$1.5">
                <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                  Size (USD)
                </Text>
                <XStack
                  backgroundColor="$gray3"
                  borderRadius="$3"
                  paddingVertical="$2"
                  paddingHorizontal="$2.5"
                  borderColor="$gray8"
                  borderWidth={1}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontFamily="$interRegular" fontSize="$3" color="$color">
                    {sizePercentage === 0
                      ? ''
                      : formatNumber(accountBalance * (sizePercentage / 100))}
                  </Text>
                  <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                    USD
                  </Text>
                </XStack>
              </YStack>

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

              {/* TP/SL and Reduce-Only */}
              <YStack gap="$1.5">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontFamily="$interRegular" fontSize="$2" color="$color">
                    TP/SL
                  </Text>
                  <Checkbox
                    size="$3"
                    checked={tpSlEnabled}
                    onCheckedChange={checked => setTpSlEnabled(checked === true)}
                  >
                    <Checkbox.Indicator />
                  </Checkbox>
                </XStack>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontFamily="$interRegular" fontSize="$2" color="$color">
                    Reduce-Only
                  </Text>
                  <Checkbox
                    size="$3"
                    checked={reduceOnlyEnabled}
                    onCheckedChange={checked => setReduceOnlyEnabled(checked === true)}
                  >
                    <Checkbox.Indicator />
                  </Checkbox>
                </XStack>
              </YStack>

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

              <Sheet
                modal
                open={leverageSheetOpen}
                onOpenChange={setLeverageSheetOpen}
                snapPointsMode="percent"
                snapPoints={[30]}
                position={leverageSheetPosition}
                onPositionChange={setLeverageSheetPosition}
                dismissOnSnapToBottom
                dismissOnOverlayPress
              >
                <Sheet.Overlay
                  animation="quick"
                  enterStyle={{ opacity: 0 }}
                  exitStyle={{ opacity: 0 }}
                  backgroundColor="rgba(0, 0, 0, 0.5)"
                />
                <Sheet.Handle />
                <Sheet.Frame
                  padding="$4"
                  gap="$4"
                  backgroundColor="$background"
                  borderTopLeftRadius="$6"
                  borderTopRightRadius="$6"
                >
                  <XStack alignItems="center" justifyContent="center">
                    <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
                      Leverage
                    </Text>
                  </XStack>

                  <YStack gap="$3">
                    <Text
                      fontFamily="$interSemiBold"
                      fontSize="$4"
                      fontWeight={400}
                      textAlign="center"
                      color="$color"
                    >
                      {leverage}x
                    </Text>
                    <Slider
                      value={[leverage]}
                      min={LEVERAGE_MIN}
                      max={LEVERAGE_MAX}
                      step={LEVERAGE_STEP}
                      onValueChange={values => {
                        const [next] = values;
                        if (typeof next !== 'number') {
                          return;
                        }

                        const clampedValue = Math.max(
                          LEVERAGE_MIN,
                          Math.min(LEVERAGE_MAX, Math.round(next)),
                        );
                        setLeverage(clampedValue);
                      }}
                    >
                      <Slider.Track backgroundColor="$gray5">
                        <Slider.TrackActive backgroundColor="$accent9" />
                      </Slider.Track>
                      <Slider.Thumb
                        index={0}
                        size="$1"
                        backgroundColor="$accent1"
                        borderWidth={1}
                        borderColor="$accent9"
                        circular
                      />
                    </Slider>
                    <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
                      <Text fontSize="$2" color="$color">
                        {LEVERAGE_MIN}x
                      </Text>
                      <Text fontSize="$2" color="$color">
                        {LEVERAGE_MAX}x
                      </Text>
                    </XStack>
                    <Button
                      width="100%"
                      height="$4"
                      size="$2"
                      backgroundColor="$accent9"
                      borderColor="$accent1"
                      borderWidth={1}
                      borderRadius="$10"
                      paddingHorizontal="$3"
                      onPress={() => setLeverageSheetOpen(false)}
                    >
                      <Text fontFamily="$interMedium" fontSize="$3" color="$accent1">
                        Done
                      </Text>
                    </Button>
                  </YStack>
                </Sheet.Frame>
              </Sheet>
            </YStack>
          </YStack>
        </XStack>

        {/* Bottom Tabs */}
        <YStack borderTopWidth={1} borderTopColor="$gray8" backgroundColor="$background">
          <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
            <TabItem
              label="Orders"
              isActive={activeTab === 'orders'}
              onPress={() => setActiveTab('orders')}
            />
            <TabItem
              label="Positions"
              isActive={activeTab === 'positions'}
              onPress={() => setActiveTab('positions')}
            />
            <TabItem
              label="History"
              isActive={activeTab === 'history'}
              onPress={() => setActiveTab('history')}
            />
          </XStack>

          {/* Tab Content */}
          <YStack minHeight={120} padding="$4">
            {activeTab === 'orders' && <OrdersTabContent />}

            {activeTab === 'positions' && (
              <YStack flex={1}>
                <PositionsTab />
              </YStack>
            )}

            {activeTab === 'history' && (
              <TabPlaceholder
                title={`${marketData.id} History`}
                message="Your trading history will appear here"
              />
            )}
          </YStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

// Tab Item Component
interface TabItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ label, isActive, onPress }: TabItemProps) {
  return (
    <XStack
      flex={1}
      paddingVertical="$3"
      justifyContent="center"
      alignItems="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      borderBottomWidth={isActive ? 2 : 0}
      borderBottomColor={isActive ? '$accent9' : 'transparent'}
    >
      <Text
        fontFamily={isActive ? '$interSemiBold' : '$interRegular'}
        fontSize="$3"
        color={isActive ? '$accent9' : '$color'}
      >
        {label}
      </Text>
    </XStack>
  );
}

interface TabPlaceholderProps {
  title: string;
  message: string;
}

function TabPlaceholder({ title, message }: TabPlaceholderProps) {
  return (
    <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$2">
      <Text fontFamily="$interSemiBold" fontSize="$5" color="$color">
        {title}
      </Text>
      <Text color="$color" textAlign="center">
        {message}
      </Text>
    </YStack>
  );
}

interface LeveragePickerProps {
  value: number;
  onPress: () => void;
  flex?: number;
}

function LeveragePicker({ value, onPress, flex }: LeveragePickerProps) {
  return (
    <XStack
      flex={flex}
      backgroundColor="$gray3"
      borderRadius="$4"
      paddingVertical="$3"
      paddingHorizontal="$3"
      borderColor="$gray8"
      borderWidth={1}
      alignItems="center"
      justifyContent="space-between"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <Text color="$color" fontSize="$3" fontFamily="$interRegular">
        {value}x
      </Text>
      <ChevronDown size="$1" color="$color" />
    </XStack>
  );
}

// SelectBox Component for dropdown selectors
interface SelectBoxProps {
  title: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  placeholder: string;
  flex?: number;
}

function SelectBox({ title, value, onValueChange, items, placeholder, flex }: SelectBoxProps) {
  // Find the selected item's label to display
  const selectedItem = items.find(item => item.value === value);
  const displayText = selectedItem?.label || placeholder;

  return (
    <AdaptiveSelect value={value} onValueChange={onValueChange} title={title}>
      <AdaptiveSelect.Trigger>
        <XStack
          flex={flex}
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$2"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Text color="$color" fontSize="$2" fontFamily="$interRegular">
            {displayText}
          </Text>
          <ChevronDown size="$0.75" color="$color" />
        </XStack>
      </AdaptiveSelect.Trigger>

      {items.map((item, index) => (
        <AdaptiveSelect.Item key={item.value} value={item.value} index={index}>
          {item.label}
        </AdaptiveSelect.Item>
      ))}
    </AdaptiveSelect>
  );
}
