import { Input, Text, XStack, YStack } from 'tamagui';

type UnitType = 'USD' | '%';

interface PricePercentInputProps {
  label: string; // "TP" or "SL"
  value: string;
  unit: UnitType;
  onValueChange: (value: string) => void;
  onUnitToggle: () => void;
}

/**
 * Reusable input component for price/percent entry with unit toggle
 */
export function PricePercentInput({
  label,
  value,
  unit,
  onValueChange,
  onUnitToggle,
}: PricePercentInputProps) {
  return (
    <YStack gap="$1.5">
      <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
        {unit === 'USD' ? `${label} Price` : `${label} (%)`}
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
          placeholder={unit === 'USD' ? '0.0' : '0'}
          value={value}
          onChangeText={onValueChange}
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
          onPress={onUnitToggle}
          pressStyle={{ opacity: 0.7 }}
          cursor="pointer"
          marginLeft="$2"
        >
          <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
            {unit}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
