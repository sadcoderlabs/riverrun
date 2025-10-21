import { useState } from 'react';
import { Check } from '@tamagui/lucide-icons';
import { Checkbox } from '@tamagui/checkbox';
import { Text, XStack, YStack } from 'tamagui';

type UnitType = 'USD' | '%';

interface TpSlInputProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tpValue: string;
  onTpValueChange: (value: string) => void;
  slValue: string;
  onSlValueChange: (value: string) => void;
}

export function TpSlInput({
  enabled,
  onEnabledChange,
  tpValue,
  onTpValueChange,
  slValue,
  onSlValueChange,
}: TpSlInputProps) {
  const [tpUnit, setTpUnit] = useState<UnitType>('USD');
  const [slUnit, setSlUnit] = useState<UnitType>('USD');

  const handleEnabledChange = (checked: boolean) => {
    onEnabledChange(checked);
    if (!checked) {
      // Clear values and reset units when unchecking
      onTpValueChange('');
      onSlValueChange('');
      setTpUnit('USD');
      setSlUnit('USD');
    }
  };

  const toggleTpUnit = () => {
    setTpUnit(prev => (prev === 'USD' ? '%' : 'USD'));
  };

  const toggleSlUnit = () => {
    setSlUnit(prev => (prev === 'USD' ? '%' : 'USD'));
  };

  return (
    <YStack gap="$2">
      {/* TP/SL Checkbox */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$color">
          TP/SL
        </Text>
        <Checkbox size="$4" checked={enabled} onCheckedChange={handleEnabledChange}>
          <Checkbox.Indicator>
            <Check />
          </Checkbox.Indicator>
        </Checkbox>
      </XStack>

      {/* TP/SL Input Fields */}
      {enabled && (
        <YStack gap="$2">
          {/* TP Price */}
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
            <XStack gap="$2" alignItems="center" flex={1}>
              <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                {tpUnit === 'USD' ? 'TP Price' : 'TP (%)'}
              </Text>
              <Text fontFamily="$interRegular" fontSize="$3" color="$color">
                {tpValue}
              </Text>
            </XStack>
            <XStack
              backgroundColor="$gray5"
              borderRadius="$2"
              paddingHorizontal="$2"
              paddingVertical="$1"
              onPress={toggleTpUnit}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                {tpUnit}
              </Text>
            </XStack>
          </XStack>

          {/* SL */}
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
            <XStack gap="$2" alignItems="center" flex={1}>
              <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                {slUnit === 'USD' ? 'SL Price' : 'SL (%)'}
              </Text>
              <Text fontFamily="$interRegular" fontSize="$3" color="$color">
                {slValue}
              </Text>
            </XStack>
            <XStack
              backgroundColor="$gray5"
              borderRadius="$2"
              paddingHorizontal="$2"
              paddingVertical="$1"
              onPress={toggleSlUnit}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                {slUnit}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
