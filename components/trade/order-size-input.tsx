import { Input } from '@/components/global/input';
import { useState } from 'react';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

interface OrderSizeInputProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  accountBalance: number;
  priceForCalculation: number; // Price used to calculate asset quantity from USD amount
}

export function OrderSizeInput({
  size,
  onSizeChange,
  leverage,
  accountBalance,
  priceForCalculation,
}: OrderSizeInputProps) {
  const [sizePercentage, setSizePercentage] = useState(0);
  const [sizeUnit, setSizeUnit] = useState<'BTC' | 'USD'>('BTC'); // Display unit

  // Convert between BTC and USD
  const btcToUsd = (btc: number): number => btc * priceForCalculation;
  const usdToBtc = (usd: number): number => usd / priceForCalculation;

  // Get the display value based on current unit
  const getDisplayValue = (): string => {
    if (!size || size === '' || size === '0') return '';
    const sizeInBtc = parseFloat(size);
    if (isNaN(sizeInBtc)) return '';

    if (sizeUnit === 'USD') {
      return btcToUsd(sizeInBtc).toFixed(2);
    }
    return size;
  };

  // Get the USD value for display below input
  const getUsdValue = (): string => {
    if (!size || size === '' || size === '0') return '0.00';
    const sizeInBtc = parseFloat(size);
    if (isNaN(sizeInBtc)) return '0.00';
    return btcToUsd(sizeInBtc).toFixed(2);
  };

  // Toggle between BTC and USD
  const handleUnitToggle = () => {
    setSizeUnit(prev => (prev === 'BTC' ? 'USD' : 'BTC'));
  };

  // Calculate size from percentage using the provided price
  const calculateSizeFromPercentage = (percent: number): string => {
    const marginUsd = accountBalance * (percent / 100);
    const sizeUsd = marginUsd * leverage;
    const sizeInBaseAsset = sizeUsd / priceForCalculation;
    return sizeInBaseAsset.toFixed(4);
  };

  // Handle percentage button click
  const handlePercentageClick = (percent: number) => {
    setSizePercentage(percent);
    const calculatedSize = calculateSizeFromPercentage(percent);
    onSizeChange(calculatedSize);
  };

  // Handle slider change
  const handleSliderChange = (values: number[]) => {
    const percent = values[0];
    setSizePercentage(percent);
    const calculatedSize = calculateSizeFromPercentage(percent);
    onSizeChange(calculatedSize);
  };

  // Handle manual size input - calculate corresponding percentage
  const handleManualSizeChange = (value: string) => {
    // Convert input to BTC if current unit is USD
    let sizeInBtc: string;
    if (sizeUnit === 'USD') {
      if (value && value !== '' && value !== '0') {
        const usdValue = parseFloat(value);
        if (!isNaN(usdValue)) {
          sizeInBtc = usdToBtc(usdValue).toFixed(4);
        } else {
          sizeInBtc = '';
        }
      } else {
        sizeInBtc = '';
      }
    } else {
      sizeInBtc = value;
    }

    // Always store and output size in BTC
    onSizeChange(sizeInBtc);

    // Calculate the percentage that corresponds to this size
    if (sizeInBtc && sizeInBtc !== '' && sizeInBtc !== '0') {
      const sizeInBaseAsset = parseFloat(sizeInBtc);
      if (!isNaN(sizeInBaseAsset)) {
        // Reverse calculation: size -> USD value -> margin -> percentage
        const sizeUsd = sizeInBaseAsset * priceForCalculation;
        const marginUsd = sizeUsd / leverage;
        const percentage = (marginUsd / accountBalance) * 100;

        // Clamp percentage between 0 and 100
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        setSizePercentage(clampedPercentage);
      } else {
        setSizePercentage(0);
      }
    } else {
      // If input is empty or zero, reset percentage
      setSizePercentage(0);
    }
  };

  return (
    <YStack gap="$2.5">
      {/* Size Input */}
      <YStack gap="$1.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Size ({sizeUnit})
        </Text>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingTop="$1.5"
          paddingBottom="$1.5"
          paddingLeft="$2.5"
          paddingRight="$1"
          borderColor="$gray8"
          borderWidth={1}
          alignItems="center"
          height="$3"
        >
          <Input
            flex={1}
            placeholder="0.0"
            value={getDisplayValue()}
            onChangeText={handleManualSizeChange}
            keyboardType="numeric"
            returnKeyType="done"
            fontSize="$3"
            fontFamily="$interRegular"
            borderWidth={0}
            paddingHorizontal={0}
            paddingVertical={0}
          />
          <Button
            backgroundColor="$gray5"
            borderRadius="$2"
            paddingHorizontal="$2"
            paddingVertical="$1"
            height="$2"
            minWidth="$4"
            marginLeft="$2"
            onPress={handleUnitToggle}
            pressStyle={{ backgroundColor: '$gray6', opacity: 0.8 }}
          >
            <Text fontFamily="$interSemiBold" fontSize="$2" color="$gray11">
              {sizeUnit}
            </Text>
          </Button>
        </XStack>
        {sizeUnit === 'BTC' && (
          <Text fontSize="$1" color="$gray10">
            ≈ ${getUsdValue()} USD
          </Text>
        )}
      </YStack>

      {/* Percentage Buttons */}
      <XStack gap="$1.5" justifyContent="space-between">
        {[25, 50, 75, 100].map(percent => (
          <Button
            key={percent}
            flex={1}
            backgroundColor="$gray5"
            borderRadius="$3"
            paddingVertical="$1.5"
            paddingHorizontal="$1"
            height="$2.5"
            onPress={() => handlePercentageClick(percent)}
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
        <Slider value={[sizePercentage]} max={100} step={1} onValueChange={handleSliderChange}>
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
    </YStack>
  );
}
