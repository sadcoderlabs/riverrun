import 'event-target-polyfill'; // polyfill for hyperliquid sdk
import 'fast-text-encoding'; // polyfill for hyperliquid sdk

import { OrdersTabContent } from '@/app/(main)/trade/[market]/(tab)/ordersTab';
import PositionsTab from '@/app/(main)/trade/[market]/(tab)/positionsTab';
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
import { Button, Sheet, Slider, Text, XStack, YStack } from 'tamagui';

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

  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'orders' | 'history'>('trade');

  // State for the order form
  const [collateralMode, setCollateralMode] = useState('Cross');
  const [leverage, setLeverage] = useState(5);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);
  const [leverageSheetPosition, setLeverageSheetPosition] = useState(0);
  const [orderType, setOrderType] = useState('Market');
  const [sizeUnit, setSizeUnit] = useState('USDC');
  const [orderSide, setOrderSide] = useState<'Long' | 'Short'>('Long');
  const [sizePercentage, setSizePercentage] = useState(0);

  const handlePlaceOrder = useCallback(
    async (context: AgentClientContext) => {
      const meta = await infoClient.meta();
      console.log('meta', meta.universe);

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

      const orderResponse = await context.agentExchangeClient.order({
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

      console.log('Agent order response', orderResponse);
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
    <YStack flex={1} padding="$0">
      {/* Tab Navigation */}
      <XStack borderBottomWidth={1} borderBottomColor="$borderColor">
        <TabItem
          label="Trade"
          isActive={activeTab === 'trade'}
          onPress={() => setActiveTab('trade')}
        />
        <TabItem
          label="Positions"
          isActive={activeTab === 'positions'}
          onPress={() => setActiveTab('positions')}
        />
        <TabItem
          label="Orders"
          isActive={activeTab === 'orders'}
          onPress={() => setActiveTab('orders')}
        />
        <TabItem
          label="History"
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
        />
      </XStack>

      <YStack flex={1}>
        {activeTab === 'trade' && (
          <YStack flex={1} padding="$4" gap="$4">
            {/* First Stack: 2x3 Grid */}
            <YStack gap="$3">
              <XStack gap="$3">
                {/* Margin Type */}
                <SelectBox
                  title="Margin Type"
                  value={collateralMode}
                  onValueChange={setCollateralMode}
                  items={[
                    { value: 'Cross', label: 'Cross' },
                    { value: 'Isolated', label: 'Isolated' },
                  ]}
                  placeholder="Cross"
                  flex={1}
                />

                {/* Leverage Picker */}
                <LeveragePicker
                  flex={1}
                  value={leverage}
                  onPress={() => {
                    setLeverageSheetPosition(0);
                    setLeverageSheetOpen(true);
                  }}
                />
              </XStack>

              <XStack gap="$3">
                {/* Long Button */}
                <Button
                  flex={1}
                  backgroundColor={orderSide === 'Long' ? '$green9' : 'transparent'}
                  borderColor={orderSide === 'Long' ? 'transparent' : '$green9'}
                  borderWidth={1}
                  paddingVertical="$1"
                  onPress={() => setOrderSide('Long')}
                  borderRadius="$4"
                  opacity={orderSide === 'Long' ? 1 : 0.4}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    fontSize="$3"
                    color={orderSide === 'Long' ? '$green1' : '$green9'}
                    textAlign="center"
                  >
                    Long
                  </Text>
                </Button>

                {/* Short Button */}
                <Button
                  flex={1}
                  backgroundColor={orderSide === 'Short' ? '$red9' : 'transparent'}
                  borderColor={orderSide === 'Short' ? 'transparent' : '$red9'}
                  borderWidth={1}
                  paddingVertical="$1"
                  onPress={() => setOrderSide('Short')}
                  borderRadius="$4"
                  opacity={orderSide === 'Short' ? 1 : 0.4}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    fontSize="$3"
                    color={orderSide === 'Short' ? '$red1' : '$red9'}
                    textAlign="center"
                  >
                    Short
                  </Text>
                </Button>
              </XStack>

              <XStack gap="$3">
                {/* Order Type Selector */}
                <SelectBox
                  title="Order Type"
                  value={orderType}
                  onValueChange={setOrderType}
                  items={[
                    { value: 'Market', label: 'Market' },
                    { value: 'Limit', label: 'Limit' },
                  ]}
                  placeholder="Market"
                  flex={1}
                />

                {/* Order Size Preference */}
                <SelectBox
                  title="Order Size"
                  value={sizeUnit}
                  onValueChange={setSizeUnit}
                  items={[
                    { value: 'USDC', label: 'USDC' },
                    { value: marketData.id.split('-')[0], label: marketData.id.split('-')[0] },
                  ]}
                  placeholder="USDC"
                  flex={1}
                />
              </XStack>
            </YStack>

            {/* Second Stack: Size Slider */}
            <YStack gap="$2" py="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text>{sizePercentage === 0 ? '0' : Math.round(sizePercentage)}% </Text>
                <Text fontSize="$3" color="$color" textAlign="center" paddingBottom="$2">
                  {sizePercentage === 0
                    ? `Available: ${formatNumber(accountBalance)} USDC`
                    : `${formatNumber(accountBalance * (sizePercentage / 100))} USDC`}
                </Text>
              </XStack>
              <Slider
                defaultValue={[0]}
                max={100}
                step={1}
                onValueChange={values => setSizePercentage(values[0])}
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
            </YStack>

            {/* Third Stack: Order Information */}
            <YStack backgroundColor="$gray3" padding="$2" borderRadius="$4" gap="$3">
              <XStack justifyContent="space-between">
                <Text color="$color" fontSize="$4">
                  Margin
                </Text>
                <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
                  {formatNumber(margin)} USDC
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$color" fontSize="$4">
                  Order Size
                </Text>
                <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
                  {formatNumber(orderSize)} USDC
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$color" fontSize="$4">
                  Liq. Price
                </Text>
                <Text color="$color" fontSize="$4" fontFamily="$interSemiBold">
                  {orderSide ? `${formatNumber(liquidationPrice)} USDC` : '--'}
                </Text>
              </XStack>
            </YStack>

            {/* Fourth Stack: Place Order Button */}
            <GateButton
              title="Place Order"
              loadingTitle="Placing..."
              buttonSize="lg"
              paddingVertical="$1"
              marginTop="auto"
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
        )}

        {activeTab === 'positions' && (
          <YStack flex={1} padding="$4">
            <PositionsTab />
          </YStack>
        )}

        {activeTab === 'orders' && <OrdersTabContent />}

        {activeTab === 'history' && (
          <TabPlaceholder
            title={`${marketData.id} History`}
            message="Your trading history will appear here"
          />
        )}
      </YStack>
    </YStack>
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
          borderRadius="$4"
          paddingVertical="$3"
          paddingHorizontal="$3"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Text color="$color" fontSize="$3" fontFamily="$interRegular">
            {displayText}
          </Text>
          <ChevronDown size="$1" color="$color" />
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
