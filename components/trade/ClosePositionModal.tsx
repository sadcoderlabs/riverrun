import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';
import * as hl from '@nktkas/hyperliquid';
import { Input } from '@/components/global/Input';
import { useHyperliquidClient, useOrder } from '@/lib/hyperliquid/hooks';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
}

interface ClosePositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionWithMarkPrice | null;
}

type OrderType = 'market' | 'limit';
type SizeUnit = 'asset' | 'usd';

export default function ClosePositionModal({
  open,
  onOpenChange,
  position,
}: ClosePositionModalProps) {
  const { getSymbolConverter, getInfoClient } = useHyperliquidClient();
  const { placeCloseMarketOrder, placeCloseLimitOrder, isPlacingOrder } = useOrder();
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('asset');
  const [percentage, setPercentage] = useState<number>(100);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [assetSize, setAssetSize] = useState<string>('');
  const [usdSize, setUsdSize] = useState<string>('');
  const [szDecimals, setSzDecimals] = useState<number | undefined>(undefined);

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
      setOrderType('market');
      setSizeUnit('asset');
      setPercentage(100);
      setLimitPrice('');
    }
  }, [open, position]);

  // Update size when szDecimals changes (after fetching)
  useEffect(() => {
    if (open && position && percentage > 0 && szDecimals !== undefined) {
      const szi = Number(position.szi);
      const positionSize = Math.abs(szi);
      const markPrice = Number(position.markPx);
      const closeSize = (positionSize * percentage) / 100;
      const closeValue = closeSize * markPrice;
      setAssetSize(formatSize(closeSize, szDecimals, false));
      setUsdSize(closeValue.toFixed(2));
    }
  }, [szDecimals, open, position, percentage]);

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

  // Calculate sizes based on percentage
  const updateSizeFromPercentage = (pct: number) => {
    const closeSize = (positionSize * pct) / 100;
    const closeValue = closeSize * markPrice;
    setAssetSize(formatSize(closeSize, szDecimals, false));
    setUsdSize(closeValue.toFixed(2));
  };

  const handlePercentageChange = (value: number[]) => {
    const pct = value[0];
    setPercentage(pct);
    updateSizeFromPercentage(pct);
  };

  const handlePercentageInputChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const pct = Math.min(Math.max(numValue, 0), 100);
    setPercentage(pct);
    updateSizeFromPercentage(pct);
  };

  const handleSizeInputChange = (value: string) => {
    if (sizeUnit === 'asset') {
      setAssetSize(value);
      const numValue = parseFloat(value) || 0;
      const pct = Math.min((numValue / positionSize) * 100, 100);
      setPercentage(pct);
      setUsdSize((numValue * markPrice).toFixed(2));
    } else {
      setUsdSize(value);
      const numValue = parseFloat(value) || 0;
      const assetValue = numValue / markPrice;
      const pct = Math.min((assetValue / positionSize) * 100, 100);
      setPercentage(pct);
      setAssetSize(formatSize(assetValue, szDecimals, false));
    }
  };

  const handleMidPrice = async () => {
    try {
      // Get mid price from allMids API
      const infoClient = getInfoClient();
      const allMids = await infoClient.allMids();
      const midPrice = allMids[position.coin];

      if (midPrice) {
        // Format mid price without thousand separators for valid order price
        setLimitPrice(formatPrice(midPrice, szDecimals, false));
      }
    } catch (error) {
      console.error('Failed to fetch mid price:', error);
    }
  };

  // Calculate estimated PnL for the close
  const closeSize = parseFloat(assetSize) || 0;

  // For limit orders, calculate PnL based on limit price
  let estimatedPnlPercentage: number | null;
  if (orderType === 'limit') {
    const limitPriceNum = parseFloat(limitPrice);
    if (!limitPrice || isNaN(limitPriceNum) || limitPriceNum <= 0) {
      estimatedPnlPercentage = null; // Invalid price
    } else {
      estimatedPnlPercentage = (limitPriceNum - entryPrice) * closeSize * (isLong ? 1 : -1);
    }
  } else {
    estimatedPnlPercentage = (percentage / 100) * unrealizedPnl;
  }

  // Check if order is valid
  const isOrderValid = (() => {
    const sizeNum = parseFloat(assetSize);
    if (!assetSize || isNaN(sizeNum) || sizeNum <= 0) {
      return false;
    }
    if (orderType === 'limit') {
      const priceNum = parseFloat(limitPrice);
      if (!limitPrice || isNaN(priceNum) || priceNum <= 0) {
        return false;
      }
    }
    return true;
  })();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        <Pressable
          style={[styles.contentContainer, orderType === 'limit' && styles.contentContainerLarge]}
          onPress={e => e.stopPropagation()}
        >
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
              {/* Order Type Tabs */}
              <XStack gap="$2">
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor={orderType === 'market' ? '$accent9' : '$gray3'}
                  onPress={() => setOrderType('market')}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    color={orderType === 'market' ? '$gray1' : '$color'}
                  >
                    Market
                  </Text>
                </Button>
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor={orderType === 'limit' ? '$accent9' : '$gray3'}
                  onPress={() => setOrderType('limit')}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    color={orderType === 'limit' ? '$gray1' : '$color'}
                  >
                    Limit
                  </Text>
                </Button>
              </XStack>

              {/* Limit Price Input (only shown for limit orders) */}
              {orderType === 'limit' && (
                <YStack gap="$2">
                  <Text fontSize="$2" color="$color9">
                    Price (USD)
                  </Text>
                  <XStack gap="$2" alignItems="center">
                    <Input
                      flex={1}
                      placeholder="0.0"
                      value={limitPrice}
                      onChangeText={setLimitPrice}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Button
                      size="$3"
                      backgroundColor="$accent9"
                      onPress={handleMidPrice}
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <Text fontFamily="$interSemiBold" color="$gray1">
                        MID
                      </Text>
                    </Button>
                  </XStack>
                </YStack>
              )}

              {/* Size Input */}
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Input
                    flex={1}
                    placeholder="0.0"
                    value={sizeUnit === 'asset' ? assetSize : usdSize}
                    onChangeText={handleSizeInputChange}
                    keyboardType="numeric"
                    returnKeyType="done"
                    fontSize="$3"
                    fontFamily="$interMedium"
                  />
                  <XStack gap="$1" marginLeft="$2">
                    <Button
                      size="$2"
                      backgroundColor={sizeUnit === 'asset' ? '$accent9' : '$gray3'}
                      onPress={() => setSizeUnit('asset')}
                      paddingHorizontal="$3"
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <Text
                        fontSize="$2"
                        fontFamily="$interSemiBold"
                        color={sizeUnit === 'asset' ? '$gray1' : '$color'}
                      >
                        {position.coin}
                      </Text>
                    </Button>
                    <Button
                      size="$2"
                      backgroundColor={sizeUnit === 'usd' ? '$accent9' : '$gray3'}
                      onPress={() => setSizeUnit('usd')}
                      paddingHorizontal="$3"
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <Text
                        fontSize="$2"
                        fontFamily="$interSemiBold"
                        color={sizeUnit === 'usd' ? '$gray1' : '$color'}
                      >
                        USD
                      </Text>
                    </Button>
                  </XStack>
                </XStack>

                {/* Percentage Slider and Input */}
                <XStack gap="$3" alignItems="center">
                  <Slider
                    flex={1}
                    value={[percentage]}
                    onValueChange={handlePercentageChange}
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
                  <XStack gap="$1" alignItems="center">
                    <Input
                      width={70}
                      placeholder="100"
                      value={percentage.toFixed(0)}
                      onChangeText={handlePercentageInputChange}
                      keyboardType="numeric"
                      returnKeyType="done"
                      textAlign="right"
                      onFocus={e => {
                        // Select all text when focused so cursor goes to the end
                        const input = e.target as any;
                        if (input?.setSelectionRange) {
                          const length = percentage.toFixed(0).length;
                          setTimeout(() => input.setSelectionRange(length, length), 0);
                        }
                      }}
                    />
                    <Text fontSize="$3" fontFamily="$interMedium" color="$color9">
                      %
                    </Text>
                  </XStack>
                </XStack>
              </YStack>

              {/* Estimated PnL */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$2"
                paddingHorizontal="$3"
                backgroundColor="$gray2"
                borderRadius="$3"
              >
                <Text fontSize="$2" color="$color9">
                  Estimated PNL:
                </Text>
                {estimatedPnlPercentage !== null ? (
                  <Text
                    fontSize="$3"
                    fontFamily="$interSemiBold"
                    color={estimatedPnlPercentage >= 0 ? '$green10' : '$red10'}
                  >
                    {estimatedPnlPercentage >= 0 ? '+' : ''}$
                    {formatValue(estimatedPnlPercentage, 2)}
                  </Text>
                ) : (
                  <Text fontSize="$3" fontFamily="$interSemiBold" color="$color9">
                    N/A
                  </Text>
                )}
              </XStack>

              {/* Confirm Button */}
              <Button
                size="$4"
                backgroundColor={isLong ? '$red9' : '$green9'}
                disabled={!isOrderValid || isPlacingOrder}
                opacity={!isOrderValid || isPlacingOrder ? 0.5 : 1}
                onPress={async () => {
                  // Validate size
                  const sizeNum = parseFloat(assetSize);
                  if (!assetSize || isNaN(sizeNum) || sizeNum <= 0) {
                    return;
                  }

                  // Validate limit price for limit orders
                  if (orderType === 'limit') {
                    const priceNum = parseFloat(limitPrice);
                    if (!limitPrice || isNaN(priceNum) || priceNum <= 0) {
                      return;
                    }
                  }

                  // Place close order
                  // Determine order side: close long position = sell (Short), close short position = buy (Long)
                  const closeSide = isLong ? 'Short' : 'Long';

                  let success: boolean;
                  if (orderType === 'market') {
                    success = await placeCloseMarketOrder({
                      coin: position.coin,
                      side: closeSide,
                      size: assetSize,
                      marketPrice: position.markPx, // Use string directly from position
                    });
                  } else {
                    success = await placeCloseLimitOrder({
                      coin: position.coin,
                      side: closeSide,
                      size: assetSize,
                      price: limitPrice,
                    });
                  }

                  // Close modal on success
                  if (success) {
                    onOpenChange(false);
                  }
                }}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text fontSize="$4" fontFamily="$interSemiBold" color="white">
                  {isPlacingOrder
                    ? 'Placing Order...'
                    : `Confirm ${orderType === 'market' ? 'Market' : 'Limit'} Close`}
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
    height: '75%',
    width: '100%',
  },
  contentContainerLarge: {
    height: '80%',
  },
});
