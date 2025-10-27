import { Input } from '@/components/global/input';
import { useCallback, useEffect, useState } from 'react';
import { Button, Slider, Text, XStack, YStack } from 'tamagui';

/**
 * OrderSizeInput Component
 *
 * A dual-unit input component that allows users to specify order size in either
 * ASSET units (e.g., BTC, ETH) or USD, with automatic conversion between units.
 *
 * KEY DESIGN PRINCIPLES:
 *
 * 1. VALUE PRESERVATION:
 *    - Stores separate values for both ASSET and USD units
 *    - When price changes, preserves the value in the unit the user last used
 *    - Example: If user typed "100 USD", that value stays as "100" even when price changes
 *
 * 2. PRICE CHANGE BEHAVIOR:
 *    - ASSET mode: Asset value unchanged → USD estimate recalculates
 *    - USD mode: USD value unchanged → Asset quantity recalculates
 *    - This prevents unwanted input field changes during price fluctuations
 *
 * 3. INPUT SOURCES:
 *    - Manual keyboard input: Updates both stored values, marks input unit
 *    - Percentage buttons (25%, 50%, 75%, 100%): Treated as ASSET input
 *    - Slider (0-100%): Treated as ASSET input
 *
 * 4. CALCULATION FORMULA:
 *    - Percentage → Size: (availableToTrade * percentage/100 * leverage) / priceForCalculation
 *    - Asset ↔ USD: asset * priceForCalculation = USD
 *
 * 5. UNIT TOGGLE:
 *    - Displays stored value for the selected unit (no recalculation on toggle)
 *    - Shows USD estimate below input when in ASSET mode
 *
 * @param size - Current size in ASSET units (always the source of truth)
 * @param onSizeChange - Callback when size changes (always returns ASSET units)
 * @param priceForCalculation - Price used for unit conversion (Limit Price or Market Price)
 * @param coin - Asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 */

interface OrderSizeInputProps {
  size: string;
  onSizeChange: (value: string) => void;
  leverage: number;
  availableToTrade: number;
  priceForCalculation: number; // Price used to calculate asset quantity from USD amount
  coin: string; // The asset symbol (e.g., 'BTC', 'ETH', 'SOL')
  szDecimals: number; // Number of decimal places for size
}

export function OrderSizeInput({
  size,
  onSizeChange,
  leverage,
  availableToTrade,
  priceForCalculation,
  coin,
  szDecimals,
}: OrderSizeInputProps) {
  const [sizePercentage, setSizePercentage] = useState(0);
  const [sizeUnit, setSizeUnit] = useState<'ASSET' | 'USD'>('ASSET'); // Display unit

  // Track last user input values for both units
  const [lastAssetInput, setLastAssetInput] = useState<string>('');
  const [lastUsdInput, setLastUsdInput] = useState<string>('');
  // Track which unit the user last used for input
  const [lastInputUnit, setLastInputUnit] = useState<'ASSET' | 'USD'>('ASSET');

  // Convert between asset and USD
  const assetToUsd = useCallback(
    (asset: number): number => asset * priceForCalculation,
    [priceForCalculation],
  );
  const usdToAsset = useCallback(
    (usd: number): number => usd / priceForCalculation,
    [priceForCalculation],
  );

  // Get the display value based on current unit
  // Always return the stored value for the current unit, not recalculate from price
  const getDisplayValue = (): string => {
    if (sizeUnit === 'ASSET') {
      return lastAssetInput;
    } else {
      return lastUsdInput;
    }
  };

  // Get the estimate value for display below input (opposite of current unit)
  const getEstimateValue = (): string => {
    if (sizeUnit === 'ASSET') {
      // In ASSET mode, show USD estimate
      if (!size || size === '' || size === '0') return '0.00';
      const sizeInAsset = parseFloat(size);
      if (isNaN(sizeInAsset)) return '0.00';
      return assetToUsd(sizeInAsset).toFixed(2);
    } else {
      // In USD mode, show ASSET estimate
      if (!lastUsdInput || lastUsdInput === '' || lastUsdInput === '0') return '0';
      const usdValue = parseFloat(lastUsdInput);
      if (isNaN(usdValue)) return '0';
      const assetValue = usdToAsset(usdValue);
      return assetValue.toFixed(szDecimals);
    }
  };

  const getEstimateLabel = (): string => {
    return sizeUnit === 'ASSET' ? 'USD' : coin;
  };

  // Toggle between asset and USD
  const handleUnitToggle = () => {
    setSizeUnit(prev => (prev === 'ASSET' ? 'USD' : 'ASSET'));
  };

  // Calculate size from percentage using the provided price
  const calculateSizeFromPercentage = (percent: number): string => {
    const marginUsd = availableToTrade * (percent / 100);
    const sizeUsd = marginUsd * leverage;
    const sizeInBaseAsset = sizeUsd / priceForCalculation;
    // Round to szDecimals to ensure correct precision
    return sizeInBaseAsset.toFixed(szDecimals);
  };

  // Handle percentage button click
  const handlePercentageClick = (percent: number) => {
    setSizePercentage(percent);
    const calculatedSize = calculateSizeFromPercentage(percent);

    // Update stored values - treat percentage input as ASSET input
    setLastAssetInput(calculatedSize);
    setLastInputUnit('ASSET');

    // Calculate corresponding USD value
    const assetValue = parseFloat(calculatedSize);
    if (!isNaN(assetValue) && assetValue > 0) {
      const usdValue = assetToUsd(assetValue).toFixed(2);
      setLastUsdInput(usdValue);
    } else {
      setLastUsdInput('');
    }

    onSizeChange(calculatedSize);
  };

  // Handle slider change
  const handleSliderChange = (values: number[]) => {
    const percent = values[0];
    setSizePercentage(percent);
    const calculatedSize = calculateSizeFromPercentage(percent);

    // Update stored values - treat slider input as ASSET input
    setLastAssetInput(calculatedSize);
    setLastInputUnit('ASSET');

    // Calculate corresponding USD value
    const assetValue = parseFloat(calculatedSize);
    if (!isNaN(assetValue) && assetValue > 0) {
      const usdValue = assetToUsd(assetValue).toFixed(2);
      setLastUsdInput(usdValue);
    } else {
      setLastUsdInput('');
    }

    onSizeChange(calculatedSize);
  };

  // Handle manual size input - calculate corresponding percentage
  const handleManualSizeChange = (value: string) => {
    let sizeInAsset: string;

    // Store the input in the appropriate state based on current unit
    if (sizeUnit === 'ASSET') {
      setLastAssetInput(value);
      setLastInputUnit('ASSET');
      sizeInAsset = value;

      // Calculate corresponding USD value for storage
      if (value && value !== '' && value !== '0') {
        const assetValue = parseFloat(value);
        if (!isNaN(assetValue)) {
          const usdValue = assetToUsd(assetValue).toFixed(2);
          setLastUsdInput(usdValue);
        } else {
          setLastUsdInput('');
        }
      } else {
        setLastUsdInput('');
      }
    } else {
      setLastUsdInput(value);
      setLastInputUnit('USD');

      // Calculate corresponding ASSET value for storage
      if (value && value !== '' && value !== '0') {
        const usdValue = parseFloat(value);
        if (!isNaN(usdValue)) {
          // Round to szDecimals to ensure correct precision
          sizeInAsset = usdToAsset(usdValue).toFixed(szDecimals);
          setLastAssetInput(sizeInAsset);
        } else {
          sizeInAsset = '';
          setLastAssetInput('');
        }
      } else {
        sizeInAsset = '';
        setLastAssetInput('');
      }
    }

    // Always output size in asset quantity
    // No rounding for manual input - let user type freely
    // Rounding will happen only when submitting the order
    onSizeChange(sizeInAsset);

    // Calculate the percentage that corresponds to this size
    if (sizeInAsset && sizeInAsset !== '' && sizeInAsset !== '0') {
      const sizeInBaseAsset = parseFloat(sizeInAsset);
      if (!isNaN(sizeInBaseAsset)) {
        // Reverse calculation: size -> USD value -> margin -> percentage
        const sizeUsd = sizeInBaseAsset * priceForCalculation;
        const marginUsd = sizeUsd / leverage;
        const percentage = (marginUsd / availableToTrade) * 100;

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

  // Initialize stored values from size prop
  useEffect(() => {
    // Only initialize if we don't have stored values yet
    if (!lastAssetInput && !lastUsdInput && size && size !== '' && size !== '0') {
      const assetValue = parseFloat(size);
      if (!isNaN(assetValue)) {
        setLastAssetInput(size);
        setLastInputUnit('ASSET');
        const usdValue = assetToUsd(assetValue).toFixed(2);
        setLastUsdInput(usdValue);
      }
    }
  }, [size, lastAssetInput, lastUsdInput, assetToUsd]);

  // Handle price changes - preserve the user's last input unit
  useEffect(() => {
    // Only recalculate if we have a valid input
    if (lastInputUnit === 'USD' && lastUsdInput && lastUsdInput !== '' && lastUsdInput !== '0') {
      // User last inputted in USD - keep USD value the same, recalculate asset
      const usdValue = parseFloat(lastUsdInput);
      if (!isNaN(usdValue)) {
        // Round to szDecimals to ensure correct precision
        const newAssetValue = usdToAsset(usdValue).toFixed(szDecimals);
        setLastAssetInput(newAssetValue);
        onSizeChange(newAssetValue);
      }
    } else if (
      lastInputUnit === 'ASSET' &&
      lastAssetInput &&
      lastAssetInput !== '' &&
      lastAssetInput !== '0'
    ) {
      // User last inputted in ASSET - keep ASSET value the same, recalculate USD
      const assetValue = parseFloat(lastAssetInput);
      if (!isNaN(assetValue)) {
        const newUsdValue = assetToUsd(assetValue).toFixed(2);
        setLastUsdInput(newUsdValue);
      }
    }
  }, [
    priceForCalculation,
    lastInputUnit,
    lastUsdInput,
    lastAssetInput,
    usdToAsset,
    assetToUsd,
    onSizeChange,
    szDecimals,
  ]);

  return (
    <YStack gap="$2.5">
      {/* Size Input */}
      <YStack gap="$1.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Size ({sizeUnit === 'ASSET' ? coin : 'USD'})
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
              {sizeUnit === 'ASSET' ? coin : 'USD'}
            </Text>
          </Button>
        </XStack>
        <Text fontSize="$1" color="$gray10">
          ≈ {sizeUnit === 'ASSET' ? '$' : ''}
          {getEstimateValue()} {getEstimateLabel()}
        </Text>
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
