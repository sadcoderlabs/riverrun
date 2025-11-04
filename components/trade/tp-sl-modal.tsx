import { useEffect, useState, useMemo } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { Checkbox } from '@tamagui/checkbox';
import * as hl from '@nktkas/hyperliquid';
import { Input } from '@/components/global/input';
import { useHyperliquidClient, useOrder } from '@/lib/hyperliquid/hooks';
import { useOrderUpdates } from '@/lib/hyperliquid/hooks/useOrderUpdates';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
}

interface TpSlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionWithMarkPrice | null;
}

export default function TpSlModal({ open, onOpenChange, position }: TpSlModalProps) {
  const { getSymbolConverter } = useHyperliquidClient();
  const { placeTpSlOrders, cancelOrder, isPlacingOrder, isCanceling } = useOrder();
  const { orders } = useOrderUpdates();

  // Position metadata
  const [szDecimals, setSzDecimals] = useState<number | undefined>(undefined);

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

  // Configure Amount state
  const [configureAmount, setConfigureAmount] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [amountPercentage, setAmountPercentage] = useState<number>(100);

  // Limit Price state
  const [limitPrice, setLimitPrice] = useState<boolean>(false);
  const [tpLimitPrice, setTpLimitPrice] = useState<string>('');
  const [slLimitPrice, setSlLimitPrice] = useState<string>('');

  // Fetch szDecimals when position changes
  useEffect(() => {
    const fetchSzDecimals = async () => {
      if (position) {
        const converter = await getSymbolConverter();
        const decimals = converter.getSzDecimals(position.coin);
        if (decimals !== undefined) {
          setSzDecimals(decimals);
        }
      }
    };
    fetchSzDecimals();
  }, [position, getSymbolConverter]);

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
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => onOpenChange(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
          <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>
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
      const percentChange = ((priceNum - entryPrice) / entryPrice) * 100;
      setTpPercent(percentChange.toFixed(2));
    } else {
      setTpPercent('');
    }
  };

  const handleTpPercentChange = (value: string) => {
    setTpPercent(value);
    const percentNum = parseFloat(value);
    if (!isNaN(percentNum)) {
      const price = entryPrice * (1 + percentNum / 100);
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
      const percentChange = ((priceNum - entryPrice) / entryPrice) * 100;
      setSlPercent(Math.abs(percentChange).toFixed(2));
    } else {
      setSlPercent('');
    }
  };

  const handleSlPercentChange = (value: string) => {
    setSlPercent(value);
    const percentNum = parseFloat(value);
    if (!isNaN(percentNum)) {
      const price = entryPrice * (1 - percentNum / 100);
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

    const success = await cancelOrder({
      coin: position.coin,
      orderId: existingTpSlOrders.tp.oid,
    });

    if (success) {
      // Clear TP input fields
      setTpPrice('');
      setTpPercent('');
    }
  };

  const handleCancelSlOrder = async () => {
    if (!existingTpSlOrders.sl) return;

    const success = await cancelOrder({
      coin: position.coin,
      orderId: existingTpSlOrders.sl.oid,
    });

    if (success) {
      // Clear SL input fields
      setSlPrice('');
      setSlPercent('');
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
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <YStack
            flex={1}
            backgroundColor="$background"
            borderTopLeftRadius="$6"
            borderTopRightRadius="$6"
            overflow="hidden"
          >
            {/* Handle bar */}
            <XStack justifyContent="center" paddingVertical="$2">
              <YStack
                opacity={0.5}
                backgroundColor="$gray9"
                height={3}
                width={32}
                borderRadius="$6"
              />
            </XStack>

            {/* Header */}
            <XStack
              justifyContent="space-between"
              alignItems="center"
              paddingHorizontal="$4"
              paddingBottom="$3"
            >
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$6" fontFamily="$interSemiBold">
                  {position.coin}-USD
                </Text>
                <YStack
                  backgroundColor={isLong ? '$green1' : '$red1'}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                >
                  <Text
                    fontSize="$2"
                    fontFamily="$interMedium"
                    color={isLong ? '$green10' : '$red10'}
                  >
                    {position.leverage.value}X {isLong ? 'LONG' : 'SHORT'}
                  </Text>
                </YStack>
              </XStack>
              <Pressable onPress={() => onOpenChange(false)}>
                <Text fontSize="$6" color="$color9">
                  ✕
                </Text>
              </Pressable>
            </XStack>

            {/* Position Metrics */}
            <XStack gap="$2" paddingHorizontal="$4" paddingBottom="$3">
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Size
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {formatSize(positionSize, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Entry
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {formatPrice(entryPrice, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text fontSize="$1" color="$color9">
                  Mark
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {formatPrice(markPrice, szDecimals, true)}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5" alignItems="flex-end">
                <Text fontSize="$1" color="$color9">
                  PnL
                </Text>
                <Text
                  fontSize="$3"
                  fontFamily="$interMedium"
                  color={unrealizedPnl >= 0 ? '$green10' : '$red10'}
                >
                  {unrealizedPnl >= 0 ? '+' : ''}${formatValue(unrealizedPnl, 2)}
                </Text>
              </YStack>
            </XStack>

            {/* Scrollable Content */}
            <YStack flex={1} paddingHorizontal="$4" gap="$3">
              {/* TP/SL Inputs */}
              <YStack gap="$3">
                {/* Take Profit */}
                <YStack gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$2" color="$color9" fontFamily="$interMedium">
                      Take Profit
                    </Text>
                    {existingTpSlOrders.tp && (
                      <Button
                        size="$2"
                        backgroundColor="$red9"
                        onPress={handleCancelTpOrder}
                        disabled={isCanceling}
                        opacity={isCanceling ? 0.5 : 1}
                        pressStyle={{ opacity: 0.8 }}
                      >
                        <Text fontSize="$1" fontFamily="$interSemiBold" color="white">
                          {isCanceling ? 'Canceling...' : 'Cancel TP'}
                        </Text>
                      </Button>
                    )}
                  </XStack>

                  {existingTpSlOrders.tp ? (
                    <YStack
                      backgroundColor="$gray3"
                      padding="$3"
                      borderRadius="$3"
                      borderWidth={1}
                      borderColor="$green9"
                    >
                      <Text fontSize="$2" color="$green10" fontFamily="$interMedium">
                        TP Order Active: {existingTpSlOrders.tp.triggerPx}
                      </Text>
                      <Text fontSize="$1" color="$color9">
                        Size: {existingTpSlOrders.tp.sz} {position.coin}
                      </Text>
                    </YStack>
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
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$2" color="$color9" fontFamily="$interMedium">
                      Stop Loss
                    </Text>
                    {existingTpSlOrders.sl && (
                      <Button
                        size="$2"
                        backgroundColor="$red9"
                        onPress={handleCancelSlOrder}
                        disabled={isCanceling}
                        opacity={isCanceling ? 0.5 : 1}
                        pressStyle={{ opacity: 0.8 }}
                      >
                        <Text fontSize="$1" fontFamily="$interSemiBold" color="white">
                          {isCanceling ? 'Canceling...' : 'Cancel SL'}
                        </Text>
                      </Button>
                    )}
                  </XStack>

                  {existingTpSlOrders.sl ? (
                    <YStack
                      backgroundColor="$gray3"
                      padding="$3"
                      borderRadius="$3"
                      borderWidth={1}
                      borderColor="$red9"
                    >
                      <Text fontSize="$2" color="$red10" fontFamily="$interMedium">
                        SL Order Active: {existingTpSlOrders.sl.triggerPx}
                      </Text>
                      <Text fontSize="$1" color="$color9">
                        Size: {existingTpSlOrders.sl.sz} {position.coin}
                      </Text>
                    </YStack>
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
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$2" color="$color" fontFamily="$interMedium">
                    Configure Amount
                  </Text>
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
                  <YStack gap="$2">
                    <XStack gap="$3" alignItems="center">
                      <Slider
                        flex={1}
                        value={[amountPercentage]}
                        onValueChange={handleAmountPercentageChange}
                        min={0}
                        max={100}
                        step={1}
                      >
                        <Slider.Track backgroundColor="$gray5" height={6}>
                          <Slider.TrackActive backgroundColor="$accent9" />
                        </Slider.Track>
                        <Slider.Thumb
                          index={0}
                          circular
                          size="$1.5"
                          backgroundColor="$accent9"
                          borderWidth={3}
                          borderColor="white"
                        />
                      </Slider>
                      <XStack gap="$1" alignItems="center" width={120}>
                        <Input
                          flex={1}
                          placeholder="0"
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
                    </XStack>
                  </YStack>
                )}
              </YStack>

              {/* Limit Price */}
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$2" color="$color" fontFamily="$interMedium">
                    Limit Price
                  </Text>
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
                        keyboardType="numeric"
                        returnKeyType="done"
                        disabled={!slPrice}
                      />
                    </YStack>
                  </XStack>
                )}
              </YStack>

              {/* Helper Text */}
              <YStack gap="$2" paddingBottom="$3">
                <Text fontSize="$1" color="$color9" lineHeight="$1">
                  By default take-profit and stop-loss orders apply to the entire position.
                  Take-profit and stop-loss automatically cancel after closing the position. A
                  market order is triggered when the stop loss or take profit price is reached.
                </Text>
                <Text fontSize="$1" color="$color9" lineHeight="$1">
                  If the order size is configured above, the TP/SL order will be for that size no
                  matter how the position changes in the future.
                </Text>
              </YStack>

              {/* Confirm Button */}
              <Button
                size="$4"
                backgroundColor="$accent9"
                disabled={!canConfirm() || isPlacingOrder}
                opacity={!canConfirm() || isPlacingOrder ? 0.5 : 1}
                onPress={handleConfirm}
                pressStyle={{ opacity: 0.8 }}
                marginBottom="$3"
              >
                <Text fontSize="$4" fontFamily="$interSemiBold" color="white">
                  {isPlacingOrder ? 'Placing Orders...' : 'Confirm'}
                </Text>
              </Button>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    height: '85%',
    width: '100%',
  },
});
