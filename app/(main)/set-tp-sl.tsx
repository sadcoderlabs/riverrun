import { Button } from '@/components/global/button';
import { H2, H5 } from '@/components/global/heading';
import { Input } from '@/components/global/input';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ScrollView, Text, View, XStack, YStack } from 'tamagui';

export default function SetTpSlScreen() {
  const { positionId, entryPx, markPrice, liquidationPx, szi } = useLocalSearchParams<{
    positionId: string;
    entryPx?: string;
    markPrice?: string;
    liquidationPx?: string;
    szi?: string;
  }>();
  const router = useRouter();

  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [takeProfitPercent, setTakeProfitPercent] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [stopLossPercent, setStopLossPercent] = useState('');

  const formatNumber = (num: string | undefined, decimals = 2) => {
    if (!num) return '-';
    const value = parseFloat(num);
    return !isNaN(value) ? value.toFixed(decimals) : '-';
  };

  // Calculate estimated PnL based on TP/SL price
  const calculateEstPnl = (targetPrice: string, currentEntry: string, positionSize: string) => {
    const target = parseFloat(targetPrice);
    const entry = parseFloat(currentEntry);
    const size = parseFloat(positionSize);

    if (isNaN(target) || isNaN(entry) || isNaN(size) || size === 0) {
      return null;
    }

    // PnL = (target price - entry price) * position size
    // Position size (szi) is positive for long, negative for short
    const pnl = (target - entry) * size;
    return pnl;
  };

  // Handle Take Profit price change
  const handleTakeProfitPriceChange = (value: string) => {
    setTakeProfitPrice(value);
    const price = parseFloat(value);
    const entry = parseFloat(entryPx || '0');
    if (!isNaN(price) && !isNaN(entry) && entry !== 0) {
      const percent = ((price - entry) / entry) * 100;
      setTakeProfitPercent(percent.toFixed(2));
    } else {
      setTakeProfitPercent('');
    }
  };

  // Handle Take Profit percent change
  const handleTakeProfitPercentChange = (value: string) => {
    setTakeProfitPercent(value);
    const percent = parseFloat(value);
    const entry = parseFloat(entryPx || '0');
    if (!isNaN(percent) && !isNaN(entry)) {
      const price = entry * (1 + percent / 100);
      setTakeProfitPrice(price.toFixed(2));
    } else {
      setTakeProfitPrice('');
    }
  };

  // Handle Stop Loss price change
  const handleStopLossPriceChange = (value: string) => {
    setStopLossPrice(value);
    const price = parseFloat(value);
    const entry = parseFloat(entryPx || '0');
    if (!isNaN(price) && !isNaN(entry) && entry !== 0) {
      const percent = ((price - entry) / entry) * 100;
      setStopLossPercent(percent.toFixed(2));
    } else {
      setStopLossPercent('');
    }
  };

  // Handle Stop Loss percent change
  const handleStopLossPercentChange = (value: string) => {
    setStopLossPercent(value);
    const percent = parseFloat(value);
    const entry = parseFloat(entryPx || '0');
    if (!isNaN(percent) && !isNaN(entry)) {
      // Auto-negate for Stop Loss - convert positive input to negative
      const negativePercent = -Math.abs(percent);
      const price = entry * (1 + negativePercent / 100);
      setStopLossPrice(price.toFixed(2));
    } else {
      setStopLossPrice('');
    }
  };

  const takeProfitPnl = calculateEstPnl(takeProfitPrice, entryPx || '0', szi || '0');
  const stopLossPnl = calculateEstPnl(stopLossPrice, entryPx || '0', szi || '0');

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'TP/SL Set Successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleDiscard = () => {
    router.back();
  };

  return (
    <View flex={1} backgroundColor="$background">
      {/* First box: Title at the top */}
      <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <H2 fontFamily="$interSemiBold" fontSize="$4" textAlign="center">
          Set TP/SL {positionId}
        </H2>
      </YStack>

      <ScrollView flex={1}>
        <YStack padding="$4" gap="$4">
          {/* Second box: Position data */}
          <YStack
            gap="$3"
            padding="$4"
            backgroundColor="$color2"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Avg. Entry
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                ${formatNumber(entryPx)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Mark Price
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                ${formatNumber(markPrice)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Liq. Price
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                {liquidationPx ? `$${formatNumber(liquidationPx)}` : '-'}
              </Text>
            </XStack>
          </YStack>

          {/* Third box: TP/SL Input groups */}
          <YStack gap="$5">
            {/* Take Profit Group */}
            <YStack gap="$3">
              <H5>Take Profit</H5>

              <XStack gap="$3">
                <YStack
                  flex={2}
                  padding="$2"
                  backgroundColor="$color2"
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <Input
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={takeProfitPrice}
                    onChangeText={handleTakeProfitPriceChange}
                  />
                </YStack>

                <XStack
                  flex={1}
                  padding="$2"
                  backgroundColor="$color2"
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  alignItems="center"
                  gap="$2"
                >
                  <Text fontSize="$5" color="$color9">
                    +
                  </Text>
                  <Input
                    placeholder="0"
                    textAlign="center"
                    keyboardType="decimal-pad"
                    value={takeProfitPercent}
                    onChangeText={handleTakeProfitPercentChange}
                    flex={1}
                  />
                  <Text fontSize="$3" color="$color9">
                    %
                  </Text>
                </XStack>
              </XStack>

              {takeProfitPnl !== null && (
                <XStack gap="$2">
                  <Text fontSize="$3" color="$color9">
                    Est. PnL :
                  </Text>
                  <Text
                    fontSize="$3"
                    fontFamily="$interMedium"
                    color={takeProfitPnl >= 0 ? '$green9' : '$red9'}
                  >
                    {takeProfitPnl >= 0 ? '+' : ''}
                    {takeProfitPnl.toFixed(2)} USDC
                  </Text>
                </XStack>
              )}
            </YStack>

            {/* Stop Loss Group */}
            <YStack gap="$3">
              <H5>Stop Loss</H5>

              <XStack gap="$3">
                <YStack
                  flex={2}
                  padding="$2"
                  backgroundColor="$color2"
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <Input
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={stopLossPrice}
                    onChangeText={handleStopLossPriceChange}
                  />
                </YStack>

                <XStack
                  flex={1}
                  padding="$2"
                  backgroundColor="$color2"
                  borderRadius="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  alignItems="center"
                  gap="$2"
                >
                  <Text fontSize="$5" color="$color9">
                    -
                  </Text>
                  <Input
                    placeholder="0"
                    textAlign="center"
                    keyboardType="decimal-pad"
                    value={stopLossPercent}
                    onChangeText={handleStopLossPercentChange}
                    flex={1}
                  />
                  <Text fontSize="$3" color="$color9">
                    %
                  </Text>
                </XStack>
              </XStack>

              {stopLossPnl !== null && (
                <XStack gap="$2">
                  <Text fontSize="$3" color="$color9">
                    Est. PnL :
                  </Text>
                  <Text
                    fontSize="$3"
                    fontFamily="$interMedium"
                    color={stopLossPnl >= 0 ? '$green9' : '$red9'}
                  >
                    {stopLossPnl >= 0 ? '+' : ''}
                    {stopLossPnl.toFixed(2)} USDC
                  </Text>
                </XStack>
              )}
            </YStack>
          </YStack>

          {/* Fourth box: Action buttons */}
          <YStack gap="$2" paddingTop="$4">
            <Button.Filled onPress={handleConfirm} level="lg">
              Confirm
            </Button.Filled>
            <Button variant="outlined" onPress={handleDiscard} level="lg">
              Discard
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}
