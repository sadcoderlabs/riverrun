import { useState } from 'react';
import { Check } from '@tamagui/lucide-icons';
import { Checkbox } from '@tamagui/checkbox';
import { Input, Text, XStack, YStack } from 'tamagui';

type UnitType = 'USD' | '%';

interface TpSlInputProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tpValue: string;
  onTpValueChange: (value: string) => void;
  tpUnit: UnitType;
  onTpUnitChange: (unit: UnitType) => void;
  slValue: string;
  onSlValueChange: (value: string) => void;
  slUnit: UnitType;
  onSlUnitChange: (unit: UnitType) => void;
}

export function TpSlInput({
  enabled,
  onEnabledChange,
  tpValue,
  onTpValueChange,
  tpUnit,
  onTpUnitChange,
  slValue,
  onSlValueChange,
  slUnit,
  onSlUnitChange,
}: TpSlInputProps) {
  const handleEnabledChange = (checked: boolean) => {
    onEnabledChange(checked);
    if (!checked) {
      // Clear values when unchecking
      onTpValueChange('');
      onSlValueChange('');
    }
  };

  const toggleTpUnit = () => {
    const newUnit: UnitType = tpUnit === 'USD' ? '%' : 'USD';
    onTpUnitChange(newUnit);
  };

  const toggleSlUnit = () => {
    const newUnit: UnitType = slUnit === 'USD' ? '%' : 'USD';
    onSlUnitChange(newUnit);
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
        <YStack gap="$2.5">
          {/* TP Input */}
          <YStack gap="$1.5">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              {tpUnit === 'USD' ? 'TP Price' : 'TP (%)'}
            </Text>
            <XStack
              backgroundColor="$gray3"
              borderRadius="$3"
              paddingVertical="$1.5"
              paddingHorizontal="$2.5"
              borderColor="$gray8"
              borderWidth={1}
              alignItems="center"
              height="$3"
            >
              <Input
                flex={1}
                placeholder={tpUnit === 'USD' ? '0.0' : '0'}
                value={tpValue}
                onChangeText={onTpValueChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                fontSize="$3"
                fontFamily="$interRegular"
                borderWidth={0}
                paddingHorizontal={0}
                paddingVertical={0}
                backgroundColor="transparent"
              />
              <XStack
                backgroundColor="$gray5"
                borderRadius="$2"
                paddingHorizontal="$2"
                paddingVertical="$1"
                onPress={toggleTpUnit}
                pressStyle={{ opacity: 0.7 }}
                cursor="pointer"
                marginLeft="$2"
              >
                <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                  {tpUnit}
                </Text>
              </XStack>
            </XStack>
          </YStack>

          {/* SL Input */}
          <YStack gap="$1.5">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              {slUnit === 'USD' ? 'SL Price' : 'SL (%)'}
            </Text>
            <XStack
              backgroundColor="$gray3"
              borderRadius="$3"
              paddingVertical="$1.5"
              paddingHorizontal="$2.5"
              borderColor="$gray8"
              borderWidth={1}
              alignItems="center"
              height="$3"
            >
              <Input
                flex={1}
                placeholder={slUnit === 'USD' ? '0.0' : '0'}
                value={slValue}
                onChangeText={onSlValueChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                fontSize="$3"
                fontFamily="$interRegular"
                borderWidth={0}
                paddingHorizontal={0}
                paddingVertical={0}
                backgroundColor="transparent"
              />
              <XStack
                backgroundColor="$gray5"
                borderRadius="$2"
                paddingHorizontal="$2"
                paddingVertical="$1"
                onPress={toggleSlUnit}
                pressStyle={{ opacity: 0.7 }}
                cursor="pointer"
                marginLeft="$2"
              >
                <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                  {slUnit}
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
