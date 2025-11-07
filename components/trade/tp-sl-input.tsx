import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from '@tamagui/lucide-icons';
import { Checkbox } from '@tamagui/checkbox';
import { Text, XStack, YStack } from 'tamagui';
import { PricePercentInput } from './price-percent-input';
import {
  calculatePercentFromPrice,
  calculatePriceFromPercent,
  type TpSlType,
} from '@/lib/hyperliquid/utils/tpsl-utils';
import { calculateTpSlPrices, validateTpSl } from '@/lib/hyperliquid/utils/order-utils';

type UnitType = 'USD' | '%';

/**
 * Validation result for TP/SL
 */
export interface TpSlValidationResult {
  isValid: boolean;
  errorTitle?: string;
  errorDescription?: string;
}

/**
 * Final calculated TP/SL trigger prices
 */
export interface TpSlResult {
  tpTriggerPrice?: string;
  slTriggerPrice?: string;
}

interface TpSlInputProps {
  // Context needed for price/percent conversion
  entryPrice: number; // Entry price for calculations
  isLong: boolean; // Position direction
  szDecimals: number; // Size decimals for formatting

  // Callback to notify parent of changes
  onChange?: (result: TpSlResult | undefined, validation: TpSlValidationResult) => void;
}

export function TpSlInput({ entryPrice, isLong, szDecimals, onChange }: TpSlInputProps) {
  // Internal state
  const [enabled, setEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [tpUnit, setTpUnit] = useState<UnitType>('%');
  const [slValue, setSlValue] = useState('');
  const [slUnit, setSlUnit] = useState<UnitType>('%');

  // Memoize calculation result to avoid recalculating on every render
  const calculationResult = useMemo(() => {
    // If not enabled, return undefined (no TP/SL)
    if (!enabled) {
      return { result: undefined, validation: { isValid: true } };
    }

    // If enabled but no values provided, return undefined with validation success
    if (!tpValue && !slValue) {
      return { result: undefined, validation: { isValid: true } };
    }

    // Calculate TP/SL prices
    const result = calculateTpSlPrices({
      tpValue,
      tpUnit,
      slValue,
      slUnit,
      entryPrice,
      isLong,
      szDecimals,
    });

    // Validate the result
    const validation = validateTpSl(result, entryPrice, isLong);

    if (validation.valid) {
      return { result, validation: { isValid: true } };
    } else {
      return {
        result: undefined,
        validation: {
          isValid: false,
          errorTitle: validation.error?.title,
          errorDescription: validation.error?.description,
        },
      };
    }
  }, [enabled, tpValue, tpUnit, slValue, slUnit, entryPrice, isLong, szDecimals]);

  // Notify parent of changes - separated from calculation to avoid circular dependencies
  useEffect(() => {
    if (onChange) {
      onChange(calculationResult.result, calculationResult.validation);
    }
  }, [calculationResult, onChange]);

  const handleEnabledChange = useCallback((checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      // Clear values when unchecking
      setTpValue('');
      setSlValue('');
    }
  }, []);

  // Generic unit toggle with bidirectional conversion
  const createUnitToggle = useCallback(
    (
      type: TpSlType,
      currentValue: string,
      currentUnit: UnitType,
      setValue: (value: string) => void,
      setUnit: (unit: UnitType) => void,
    ) => {
      return () => {
        const newUnit: UnitType = currentUnit === 'USD' ? '%' : 'USD';

        // Convert existing value to new unit
        if (currentValue && entryPrice > 0) {
          const parsedValue = parseFloat(currentValue);
          if (isFinite(parsedValue)) {
            let convertedValue: string;
            if (newUnit === '%' && currentUnit === 'USD') {
              // USD → %
              convertedValue = calculatePercentFromPrice(entryPrice, parsedValue, isLong, type);
            } else if (newUnit === 'USD' && currentUnit === '%') {
              // % → USD
              convertedValue = calculatePriceFromPercent(
                entryPrice,
                parsedValue,
                isLong,
                type,
                szDecimals,
              );
            } else {
              convertedValue = currentValue;
            }
            setValue(convertedValue);
          }
        }
        setUnit(newUnit);
      };
    },
    [entryPrice, isLong, szDecimals],
  );

  const toggleTpUnit = createUnitToggle('tp', tpValue, tpUnit, setTpValue, setTpUnit);
  const toggleSlUnit = createUnitToggle('sl', slValue, slUnit, setSlValue, setSlUnit);

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
          <PricePercentInput
            label="TP"
            value={tpValue}
            unit={tpUnit}
            onValueChange={setTpValue}
            onUnitToggle={toggleTpUnit}
          />
          <PricePercentInput
            label="SL"
            value={slValue}
            unit={slUnit}
            onValueChange={setSlValue}
            onUnitToggle={toggleSlUnit}
          />
        </YStack>
      )}
    </YStack>
  );
}
