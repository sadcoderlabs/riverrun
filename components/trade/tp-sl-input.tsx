import { useCallback, useImperativeHandle, useState, forwardRef } from 'react';
import { Check } from '@tamagui/lucide-icons';
import { Checkbox } from '@tamagui/checkbox';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  calculateSlPercentFromPrice,
  calculateSlPriceFromPercent,
  calculateTpPercentFromPrice,
  calculateTpPriceFromPercent,
} from '@/lib/hyperliquid/utils/tpsl-utils';

type UnitType = 'USD' | '%';

/**
 * TP/SL configuration returned to parent component
 */
export interface TpSlConfig {
  enabled: boolean;
  tpValue: string;
  tpUnit: UnitType;
  slValue: string;
  slUnit: UnitType;
}

interface TpSlInputProps {
  // Context needed for price/percent conversion
  entryPrice: number; // Entry price for calculations
  isLong: boolean; // Position direction
  szDecimals: number; // Size decimals for formatting
}

/**
 * Methods exposed to parent via ref
 */
export interface TpSlInputRef {
  getConfig: () => TpSlConfig;
  reset: () => void;
}

export const TpSlInput = forwardRef<TpSlInputRef, TpSlInputProps>(
  ({ entryPrice, isLong, szDecimals }, ref) => {
    // Internal state
    const [enabled, setEnabled] = useState(false);
    const [tpValue, setTpValue] = useState('');
    const [tpUnit, setTpUnit] = useState<UnitType>('%');
    const [slValue, setSlValue] = useState('');
    const [slUnit, setSlUnit] = useState<UnitType>('%');

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getConfig: () => ({
        enabled,
        tpValue,
        tpUnit,
        slValue,
        slUnit,
      }),
      reset: () => {
        setEnabled(false);
        setTpValue('');
        setSlValue('');
      },
    }));

    const handleEnabledChange = useCallback((checked: boolean) => {
      setEnabled(checked);
      if (!checked) {
        // Clear values when unchecking
        setTpValue('');
        setSlValue('');
      }
    }, []);

    // TP unit toggle with bidirectional conversion
    const toggleTpUnit = useCallback(() => {
      const newUnit: UnitType = tpUnit === 'USD' ? '%' : 'USD';

      // Convert existing value to new unit
      if (tpValue && entryPrice > 0) {
        const currentValue = parseFloat(tpValue);
        if (isFinite(currentValue)) {
          let convertedValue: string;
          if (newUnit === '%' && tpUnit === 'USD') {
            // USD → %
            convertedValue = calculateTpPercentFromPrice(entryPrice, currentValue, isLong);
          } else if (newUnit === 'USD' && tpUnit === '%') {
            // % → USD
            convertedValue = calculateTpPriceFromPercent(
              entryPrice,
              currentValue,
              isLong,
              szDecimals,
            );
          } else {
            convertedValue = tpValue;
          }
          setTpValue(convertedValue);
        }
      }
      setTpUnit(newUnit);
    }, [tpValue, tpUnit, entryPrice, isLong, szDecimals]);

    // SL unit toggle with bidirectional conversion
    const toggleSlUnit = useCallback(() => {
      const newUnit: UnitType = slUnit === 'USD' ? '%' : 'USD';

      // Convert existing value to new unit
      if (slValue && entryPrice > 0) {
        const currentValue = parseFloat(slValue);
        if (isFinite(currentValue)) {
          let convertedValue: string;
          if (newUnit === '%' && slUnit === 'USD') {
            // USD → %
            convertedValue = calculateSlPercentFromPrice(entryPrice, currentValue, isLong);
          } else if (newUnit === 'USD' && slUnit === '%') {
            // % → USD
            convertedValue = calculateSlPriceFromPercent(
              entryPrice,
              currentValue,
              isLong,
              szDecimals,
            );
          } else {
            convertedValue = slValue;
          }
          setSlValue(convertedValue);
        }
      }
      setSlUnit(newUnit);
    }, [slValue, slUnit, entryPrice, isLong, szDecimals]);

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
                  onChangeText={setTpValue}
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
                  onChangeText={setSlValue}
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
  },
);

TpSlInput.displayName = 'TpSlInput';
