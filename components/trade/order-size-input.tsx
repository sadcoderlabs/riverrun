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

  // Handle manual size input - reset percentage to 0
  const handleManualSizeChange = (value: string) => {
    setSizePercentage(0);
    onSizeChange(value);
  };

  return (
    <YStack gap="$2.5">
      {/* Size Input */}
      <YStack gap="$1.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Size
        </Text>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$1.5"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
          justifyContent="space-between"
          alignItems="center"
          height="$3"
        >
          <Input
            flex={1}
            placeholder="0.0"
            value={size}
            onChangeText={handleManualSizeChange}
            keyboardType="numeric"
            returnKeyType="done"
            fontSize="$3"
            fontFamily="$interRegular"
            borderWidth={0}
            paddingHorizontal={0}
            paddingVertical={0}
          />
          <Text fontFamily="$interSemiBold" fontSize="$2" color="$gray10" marginLeft="$2">
            BTC
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
