import { useMarketStore, useOrder, useOrderStore } from '@/app-internal';
import { Button } from '@/app-internal/components/global/Button';
import { Input } from '@/app-internal/components/global/Input';
import { formatPrice } from '@/infra/hyperliquid/format/formatPrice';
import { formatSize } from '@/infra/hyperliquid/format/formatSize';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import * as hl from '@nktkas/hyperliquid';
import { Checkbox } from '@tamagui/checkbox';
import { Check, X } from '@tamagui/lucide-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Sheet, Slider, Spinner, XStack, YStack } from 'tamagui';
import { Text } from '../global/Text';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
  szDecimals: number;
}

interface TpSlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionWithMarkPrice | null;
}

export default function TpSlModal({ open, onOpenChange, position }: TpSlModalProps) {
  const { placeTpSlOrders, cancelOrder, isPlacingOrder } = useOrder();
  const orders = useOrderStore(state => state.orders);
  const markets = useMarketStore(state => state.markets);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);

  // Get szDecimals from position (available from WebData2 subscription)
  const szDecimals = position?.szDecimals;

  // Get market pair for display
  const marketPair = useMemo(() => {
    if (!position) return '';
    const market = markets.find(m => m.coin === position.coin);
    return market?.marketPair ?? `${position.coin}-USDC`;
  }, [markets, position]);

  // Find existing TP/SL orders for this position
  const existingTpSlOrders = useMemo(() => {
    if (!position) return { tp: null, sl: null };

    const positionOrders = orders.filter(
      order =>
        order.coin === position.coin &&
        order.isTrigger === true &&
        order.reduceOnly === true &&
        (order.orderType === 'Take Profit Market' ||
          order.orderType === 'Take Profit Limit' ||
          order.orderType === 'Stop Market' ||
          order.orderType === 'Stop Limit'),
    );

    const tpOrder = positionOrders.find(
      order => order.orderType === 'Take Profit Market' || order.orderType === 'Take Profit Limit',
    );
    const slOrder = positionOrders.find(
      order => order.orderType === 'Stop Market' || order.orderType === 'Stop Limit',
    );

    return { tp: tpOrder || null, sl: slOrder || null };
  }, [orders, position]);

  // TP/SL state
  const [tpPrice, setTpPrice] = useState<string>('');
  const [tpPercent, setTpPercent] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [slPercent, setSlPercent] = useState<string>('');

  // Individual loading states for TP/SL cancel buttons
  const [isCancelingTp, setIsCancelingTp] = useState<boolean>(false);
  const [isCancelingSl, setIsCancelingSl] = useState<boolean>(false);

  // Configure Amount state
  const [configureAmount, setConfigureAmount] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [amountPercentage, setAmountPercentage] = useState<number>(100);

  // Limit Price state
  const [limitPrice, setLimitPrice] = useState<boolean>(false);
  const [tpLimitPrice, setTpLimitPrice] = useState<string>('');
  const [slLimitPrice, setSlLimitPrice] = useState<string>('');

  // Reset state when modal opens/closes or position changes
  useEffect(() => {
    if (open && position) {
      setTpPrice('');
      setTpPercent('');
      setSlPrice('');
      setSlPercent('');
      setConfigureAmount(false);
      setLimitPrice(false);
      setTpLimitPrice('');
      setSlLimitPrice('');
      setAmountPercentage(100);
    }
  }, [open, position]);

  // Update amount when position or percentage changes
  useEffect(() => {
    if (open && position && configureAmount && szDecimals !== undefined) {
      const szi = Number(position.szi);
      const positionSize = Math.abs(szi);
      const size = (positionSize * amountPercentage) / 100;
      setAmount(formatSize(size, szDecimals, false));
    }
  }, [open, position, configureAmount, amountPercentage, szDecimals]);

  if (!position) return null;

  // Show loading if szDecimals not yet loaded
  if (szDecimals === undefined) {
    return (
      <Sheet
        modal
        native
        open={open}
        onOpenChange={() => onOpenChange(false)}
        position={0}
        dismissOnSnapToBottom
        dismissOnOverlayPress
      >
        <Sheet.Overlay
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.7)"
        />
        <Sheet.Frame
          padding="$2"
          backgroundColor="$background"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6"
        >
          {/* Handle */}
          <YStack
            opacity={0.5}
            backgroundColor="$gray9"
            height={3}
            width={32}
            alignSelf="center"
            borderRadius="$12"
          />
          <YStack
            flex={1}
            backgroundColor="$background"
            borderTopLeftRadius="$6"
            borderTopRightRadius="$6"
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize="$4" color="$color9">
              Loading...
            </Text>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    );
  }

  const szi = Number(position.szi);
  const positionSize = Math.abs(szi);
  const isLong = szi > 0;
  const markPrice = Number(position.markPx);
  const entryPrice = Number(position.entryPx);
  const unrealizedPnl = Number(position.unrealizedPnl);

  // Bidirectional calculation: TP Price ↔ TP Percent
  const handleTpPriceChange = (value: string) => {
    setTpPrice(value);
    const priceNum = parseFloat(value);
    if (!isNaN(priceNum) && priceNum > 0) {
      // For LONG: gain = (price - entry) / entry, for SHORT: gain = (entry - price) / entry
      const percentChange = isLong
        ? ((priceNum - entryPrice) / entryPrice) * 100
        : ((entryPrice - priceNum) / entryPrice) * 100;
      setTpPercent(percentChange.toFixed(2));
    } else {
      setTpPercent('');
    }
  };

  const handleTpPercentChange = (value: string) => {
    setTpPercent(value);
    const percentNum = parseFloat(value);
    if (!isNaN(percentNum)) {
      // For LONG: TP is above entry, for SHORT: TP is below entry
      const price = isLong
        ? entryPrice * (1 + percentNum / 100)
        : entryPrice * (1 - percentNum / 100);
      setTpPrice(formatPrice(price, szDecimals, false));
    } else {
      setTpPrice('');
    }
  };

  // Bidirectional calculation: SL Price ↔ SL Percent
  const handleSlPriceChange = (value: string) => {
    setSlPrice(value);
    const priceNum = parseFloat(value);
    if (!isNaN(priceNum) && priceNum > 0) {
      // For LONG: loss = (entry - price) / entry, for SHORT: loss = (price - entry) / entry
      const percentChange = isLong
        ? ((entryPrice - priceNum) / entryPrice) * 100
        : ((priceNum - entryPrice) / entryPrice) * 100;
      setSlPercent(percentChange.toFixed(2));
    } else {
      setSlPercent('');
    }
  };

  const handleSlPercentChange = (value: string) => {
    setSlPercent(value);
    const percentNum = parseFloat(value);
    if (!isNaN(percentNum)) {
      // For LONG: SL is below entry, for SHORT: SL is above entry
      const price = isLong
        ? entryPrice * (1 - percentNum / 100)
        : entryPrice * (1 + percentNum / 100);
      setSlPrice(formatPrice(price, szDecimals, false));
    } else {
      setSlPrice('');
    }
  };

  // Calculate expected profit/loss
  const calculateExpectedProfit = () => {
    const tpPriceNum = parseFloat(tpPrice);
    if (isNaN(tpPriceNum) || tpPriceNum <= 0) return null;

    const orderSize = configureAmount ? parseFloat(amount) || 0 : positionSize;
    const profit = (tpPriceNum - entryPrice) * orderSize * (isLong ? 1 : -1);
    return profit;
  };

  const calculateExpectedLoss = () => {
    const slPriceNum = parseFloat(slPrice);
    if (isNaN(slPriceNum) || slPriceNum <= 0) return null;

    const orderSize = configureAmount ? parseFloat(amount) || 0 : positionSize;
    const loss = (slPriceNum - entryPrice) * orderSize * (isLong ? 1 : -1);
    return loss;
  };

  const expectedProfit = calculateExpectedProfit();
  const expectedLoss = calculateExpectedLoss();

  // Handle amount slider
  const handleAmountPercentageChange = (value: number[]) => {
    const pct = value[0];
    setAmountPercentage(pct);
    const size = (positionSize * pct) / 100;
    setAmount(formatSize(size, szDecimals, false));
  };

  const handleAmountInputChange = (value: string) => {
    setAmount(value);
    const numValue = parseFloat(value) || 0;
    const pct = Math.min((numValue / positionSize) * 100, 100);
    setAmountPercentage(pct);
  };

  // Validation
  const isTpValid = () => {
    const tpPriceNum = parseFloat(tpPrice);
    if (isNaN(tpPriceNum) || tpPriceNum <= 0) return false;

    // TP price must be > entry for LONG, < entry for SHORT
    if (isLong && tpPriceNum <= entryPrice) return false;
    if (!isLong && tpPriceNum >= entryPrice) return false;

    return true;
  };

  const isSlValid = () => {
    const slPriceNum = parseFloat(slPrice);
    if (isNaN(slPriceNum) || slPriceNum <= 0) return false;

    // SL price must be < entry for LONG, > entry for SHORT
    if (isLong && slPriceNum >= entryPrice) return false;
    if (!isLong && slPriceNum <= entryPrice) return false;

    return true;
  };

  const canConfirm = () => {
    // If both TP and SL already exist, cannot confirm (can only cancel)
    if (existingTpSlOrders.tp && existingTpSlOrders.sl) {
      return false;
    }

    // At least one of TP or SL must be set (and not already existing)
    const hasTp = tpPrice.length > 0 && isTpValid() && !existingTpSlOrders.tp;
    const hasSl = slPrice.length > 0 && isSlValid() && !existingTpSlOrders.sl;

    if (!hasTp && !hasSl) return false;

    // If configure amount is enabled, validate amount
    if (configureAmount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0 || amountNum > positionSize) {
        return false;
      }
    }

    // If limit price is enabled, validate limit prices
    if (limitPrice) {
      if (hasTp) {
        const tpLimitNum = parseFloat(tpLimitPrice);
        if (isNaN(tpLimitNum) || tpLimitNum <= 0) return false;
      }
      if (hasSl) {
        const slLimitNum = parseFloat(slLimitPrice);
        if (isNaN(slLimitNum) || slLimitNum <= 0) return false;
      }
    }

    return true;
  };

  const handleCancelTpOrder = async () => {
    if (!existingTpSlOrders.tp) return;

    setIsCancelingTp(true);
    try {
      const success = await cancelOrder({
        coin: position.coin,
        orderId: existingTpSlOrders.tp.oid,
      });

      if (success) {
        // Clear TP input fields
        setTpPrice('');
        setTpPercent('');
      }
    } finally {
      setIsCancelingTp(false);
    }
  };

  const handleCancelSlOrder = async () => {
    if (!existingTpSlOrders.sl) return;

    setIsCancelingSl(true);
    try {
      const success = await cancelOrder({
        coin: position.coin,
        orderId: existingTpSlOrders.sl.oid,
      });

      if (success) {
        // Clear SL input fields
        setSlPrice('');
        setSlPercent('');
      }
    } finally {
      setIsCancelingSl(false);
    }
  };

  const handleConfirm = async () => {
    // Determine order size
    const orderSize = configureAmount ? amount : formatSize(positionSize, szDecimals, false);

    // Build TP/SL parameters (only include if not already existing)
    const success = await placeTpSlOrders({
      coin: position.coin,
      isLong,
      size: orderSize,
      // Take Profit (only if not already set)
      tpTriggerPrice: !existingTpSlOrders.tp && tpPrice ? tpPrice : undefined,
      tpLimitPrice:
        !existingTpSlOrders.tp && limitPrice && tpPrice ? tpLimitPrice || undefined : undefined,
      // Stop Loss (only if not already set)
      slTriggerPrice: !existingTpSlOrders.sl && slPrice ? slPrice : undefined,
      slLimitPrice:
        !existingTpSlOrders.sl && limitPrice && slPrice ? slLimitPrice || undefined : undefined,
    });

    // Close modal on success
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet
      modal
      native
      open={open}
      onOpenChange={() => onOpenChange(false)}
      snapPoints={[90]}
      position={0}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.7)"
      />
      <Sheet.Frame
        padding="$2"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        {/* Handle */}
        <YStack
          opacity={0.5}
          backgroundColor="$gray9"
          height={3}
          width={32}
          marginTop="$2"
          alignSelf="center"
          borderRadius="$12"
        />
        <YStack
          flex={1}
          backgroundColor="$background"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6"
        >
          {/* Scrollable Content */}
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 12 }}
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$4" fontWeight={500}>
                  {marketPair}
                </Text>
                <YStack
                  backgroundColor={isLong ? '$green1' : '$red1'}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color={isLong ? '$green10' : '$red10'}>
                    {isLong ? 'LONG' : 'SHORT'} {position.leverage.value}X
                  </Text>
                </YStack>
              </XStack>
            </XStack>

            {/* Position Metrics */}
            <XStack gap="$2">
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Size
                </Text>
                <Text fontSize="$3" fontWeight={400}>
                  {formatSize(positionSize, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Entry
                </Text>
                <Text fontSize="$3" fontWeight={400}>
                  {formatPrice(entryPrice, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Mark
                </Text>
                <Text fontSize="$3" fontWeight={400}>
                  {formatPrice(markPrice, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5" alignItems="flex-end">
                <Text fontSize="$1" color="$color9">
                  PnL
                </Text>
                <Text
                  fontSize="$3"
                  fontWeight={400}
                  color={unrealizedPnl >= 0 ? '$green10' : '$red10'}
                >
                  {unrealizedPnl >= 0 ? '+' : ''}${formatValue(unrealizedPnl, 2)}
                </Text>
              </YStack>
            </XStack>

            {/* TP/SL Inputs */}
            <YStack gap="$3" marginTop="$4">
              {/* Take Profit */}
              <YStack gap="$3">
                <Text.Footnote color="$color">Take Profit</Text.Footnote>

                {existingTpSlOrders.tp ? (
                  <XStack
                    backgroundColor="$gray3"
                    padding="$3"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="$green9"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <YStack gap="$1">
                      <Text color="$green10">{existingTpSlOrders.tp.triggerPx}</Text>
                      <Text fontSize="$1" color="$color9">
                        Size: {existingTpSlOrders.tp.sz} {position.coin}
                      </Text>
                    </YStack>
                    <XStack
                      onPress={handleCancelTpOrder}
                      disabled={isCancelingTp}
                      padding="$2"
                      pressStyle={{ opacity: 0.6 }}
                      cursor="pointer"
                    >
                      {isCancelingTp ? (
                        <Spinner size="small" color="$color9" />
                      ) : (
                        <X size={20} color="$color9" />
                      )}
                    </XStack>
                  </XStack>
                ) : (
                  <>
                    <XStack gap="$2">
                      <YStack flex={1} gap="$1">
                        <Text fontSize="$1" color="$color9">
                          TP Price
                        </Text>
                        <Input
                          placeholder="0.0"
                          value={tpPrice}
                          onChangeText={handleTpPriceChange}
                          backgroundColor="$gray3"
                          keyboardType="numeric"
                          returnKeyType="done"
                        />
                      </YStack>
                      <YStack flex={1} gap="$1">
                        <Text fontSize="$1" color="$color9">
                          Gain
                        </Text>
                        <XStack alignItems="center" gap="$1">
                          <Input
                            flex={1}
                            placeholder="0"
                            value={tpPercent}
                            onChangeText={handleTpPercentChange}
                            backgroundColor="$gray3"
                            keyboardType="numeric"
                            returnKeyType="done"
                          />
                          <Text fontSize="$3" fontFamily="$interMedium" color="$color9">
                            %
                          </Text>
                        </XStack>
                      </YStack>
                    </XStack>
                    {expectedProfit !== null && (
                      <Text fontSize="$2" color="$color9">
                        Expected profit: {expectedProfit >= 0 ? '+' : ''}
                        {formatValue(expectedProfit, 2)} USDC
                      </Text>
                    )}
                  </>
                )}
              </YStack>

              {/* Stop Loss */}
              <YStack gap="$2">
                <Text.Footnote color="$color">Stop Loss</Text.Footnote>

                {existingTpSlOrders.sl ? (
                  <XStack
                    backgroundColor="$gray3"
                    padding="$3"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="$red9"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <YStack gap="$1">
                      <Text color="$red10">{existingTpSlOrders.sl.triggerPx}</Text>
                      <Text fontSize="$1" color="$color9">
                        Size: {existingTpSlOrders.sl.sz} {position.coin}
                      </Text>
                    </YStack>
                    <XStack
                      onPress={handleCancelSlOrder}
                      disabled={isCancelingSl}
                      padding="$2"
                      pressStyle={{ opacity: 0.6 }}
                      cursor="pointer"
                    >
                      {isCancelingSl ? (
                        <Spinner size="small" color="$color9" />
                      ) : (
                        <X size={20} color="$color9" />
                      )}
                    </XStack>
                  </XStack>
                ) : (
                  <>
                    <XStack gap="$2">
                      <YStack flex={1} gap="$1">
                        <Text fontSize="$1" color="$color9">
                          SL Price
                        </Text>
                        <Input
                          placeholder="0.0"
                          value={slPrice}
                          onChangeText={handleSlPriceChange}
                          backgroundColor="$gray3"
                          keyboardType="numeric"
                          returnKeyType="done"
                        />
                      </YStack>
                      <YStack flex={1} gap="$1">
                        <Text fontSize="$1" color="$color9">
                          Loss
                        </Text>
                        <XStack alignItems="center" gap="$1">
                          <Input
                            flex={1}
                            placeholder="0"
                            value={slPercent}
                            onChangeText={handleSlPercentChange}
                            backgroundColor="$gray3"
                            keyboardType="numeric"
                            returnKeyType="done"
                          />
                          <Text fontSize="$3" fontFamily="$interMedium" color="$color9">
                            %
                          </Text>
                        </XStack>
                      </YStack>
                    </XStack>
                    {expectedLoss !== null && (
                      <Text fontSize="$2" color="$color9">
                        Expected loss: {expectedLoss >= 0 ? '+' : ''}
                        {formatValue(expectedLoss, 2)} USDC
                      </Text>
                    )}
                  </>
                )}
              </YStack>
            </YStack>

            {/* Configure Amount */}
            <YStack gap="$2" marginTop="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text.Footnote color="$color">Configure Amount</Text.Footnote>
                <Checkbox
                  size="$4"
                  checked={configureAmount}
                  onCheckedChange={checked => setConfigureAmount(checked === true)}
                >
                  <Checkbox.Indicator>
                    <Check />
                  </Checkbox.Indicator>
                </Checkbox>
              </XStack>

              {configureAmount && (
                <YStack gap="$3">
                  <XStack justifyContent="flex-end" alignItems="center" gap="$2">
                    <Input
                      placeholder="0"
                      fontSize="$3"
                      width={100}
                      value={amount}
                      onChangeText={handleAmountInputChange}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                    />
                    <Text fontSize="$2" fontFamily="$interMedium" color="$color9">
                      {position.coin}
                    </Text>
                  </XStack>
                  <Slider
                    value={[amountPercentage]}
                    onValueChange={handleAmountPercentageChange}
                    min={0}
                    max={100}
                    step={1}
                    size="$3"
                    marginBottom="$3"
                  >
                    <Slider.Track backgroundColor="$gray5" height="$0.75">
                      <Slider.TrackActive backgroundColor="$accent9" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      circular
                      size="$1.5"
                      backgroundColor="$accent1"
                      borderWidth={2}
                      borderColor="$accent9"
                    />
                  </Slider>
                </YStack>
              )}
            </YStack>

            {/* Limit Price */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text.Footnote color="$color">Limit Price</Text.Footnote>
                <Checkbox
                  size="$4"
                  checked={limitPrice}
                  onCheckedChange={checked => setLimitPrice(checked === true)}
                >
                  <Checkbox.Indicator>
                    <Check />
                  </Checkbox.Indicator>
                </Checkbox>
              </XStack>

              {limitPrice && (
                <XStack gap="$2">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$1" color="$color9">
                      TP Limit Price
                    </Text>
                    <Input
                      placeholder="0.0"
                      value={tpLimitPrice}
                      onChangeText={setTpLimitPrice}
                      backgroundColor="$gray3"
                      keyboardType="numeric"
                      returnKeyType="done"
                      disabled={!tpPrice}
                    />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$1" color="$color9">
                      SL Limit Price
                    </Text>
                    <Input
                      placeholder="0.0"
                      value={slLimitPrice}
                      onChangeText={setSlLimitPrice}
                      backgroundColor="$gray3"
                      keyboardType="numeric"
                      returnKeyType="done"
                      disabled={!slPrice}
                    />
                  </YStack>
                </XStack>
              )}
            </YStack>

            {/* Info */}
            <YStack backgroundColor="$gray2" padding="$3" borderRadius="$3" gap="$1.5">
              <Text fontSize="$1" color="$color10" lineHeight={16}>
                • TP/SL applies to entire position by default
              </Text>
              <Text fontSize="$1" color="$color10" lineHeight={16}>
                • Orders auto-cancel when position closes
              </Text>
              {configureAmount && (
                <Text fontSize="$1" color="$color10" lineHeight={16}>
                  • Configured size remains fixed regardless of position changes
                </Text>
              )}
            </YStack>
          </ScrollView>

          {/* Confirm Button - Pinned at Bottom */}
          <YStack padding="$4" paddingTop="$3" backgroundColor="$background">
            <Button.Filled
              backgroundColor="$accent9"
              height="$5"
              disabled={!canConfirm() || isPlacingOrder}
              opacity={!canConfirm() || isPlacingOrder ? 0.5 : 1}
              onPress={handleConfirm}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize="$4" color="$color1">
                {isPlacingOrder ? 'Placing Orders...' : 'Confirm'}
              </Text>
            </Button.Filled>
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
