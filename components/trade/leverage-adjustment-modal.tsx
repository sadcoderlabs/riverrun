import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { toast } from 'sonner-native';
import { Button, Slider, Spinner, Text, XStack, YStack } from 'tamagui';

const LEVERAGE_MIN = 1;
const LEVERAGE_MAX = 20;
const LEVERAGE_STEP = 1;

interface LeverageAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leverage: number;
  onLeverageChange: (leverage: number) => void;
  marginMode: string;
  onMarginModeChange: (mode: string) => void;
  coin: string;
}

export function LeverageAdjustmentModal({
  open,
  onOpenChange,
  leverage,
  onLeverageChange,
  marginMode,
  onMarginModeChange,
  coin,
}: LeverageAdjustmentModalProps) {
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state to track user's selection before confirming
  const [selectedLeverage, setSelectedLeverage] = useState(leverage);
  const [selectedMarginMode, setSelectedMarginMode] = useState(marginMode);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (open) {
      setSelectedLeverage(leverage);
      setSelectedMarginMode(marginMode);
    }
  }, [open, leverage, marginMode]);

  // Handle margin mode change - immediately call API
  const handleMarginModeChange = useCallback(
    async (newMode: string) => {
      if (isUpdating) return;

      const isCross = newMode === 'Cross';
      setIsUpdating(true);

      try {
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          // User cancelled or approval failed
          setIsUpdating(false);
          return;
        }

        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(coin);

        if (assetId === undefined) {
          toast.error('Invalid Asset', {
            description: `Unable to find asset ID for ${coin}`,
          });
          setIsUpdating(false);
          return;
        }

        await exchangeClient.updateLeverage({
          asset: assetId,
          isCross,
          leverage: selectedLeverage,
        });

        // Update local state and parent state
        setSelectedMarginMode(newMode);
        onMarginModeChange(newMode);

        toast.success('Margin Mode Updated', {
          description: `Successfully switched to ${newMode} margin mode for ${coin}`,
        });
      } catch (error) {
        console.error('Failed to update margin mode:', error);
        toast.error('Failed to Update Margin Mode', {
          description: error instanceof Error ? error.message : 'An error occurred',
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [
      coin,
      getAgentExchangeClient,
      getSymbolConverter,
      isUpdating,
      onMarginModeChange,
      selectedLeverage,
    ],
  );

  // Handle leverage confirmation - call API on confirm button
  const handleConfirm = useCallback(async () => {
    if (isUpdating) return;

    const isCross = selectedMarginMode === 'Cross';
    setIsUpdating(true);

    try {
      const exchangeClient = await getAgentExchangeClient();
      if (!exchangeClient) {
        // User cancelled or approval failed
        setIsUpdating(false);
        return;
      }

      const converter = await getSymbolConverter();
      const assetId = converter.getAssetId(coin);

      if (assetId === undefined) {
        toast.error('Invalid Asset', {
          description: `Unable to find asset ID for ${coin}`,
        });
        setIsUpdating(false);
        return;
      }

      await exchangeClient.updateLeverage({
        asset: assetId,
        isCross,
        leverage: selectedLeverage,
      });

      // Update parent state
      onLeverageChange(selectedLeverage);

      toast.success('Leverage Updated', {
        description: `Successfully set leverage to ${selectedLeverage}x for ${coin}`,
      });

      // Close modal
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update leverage:', error);
      toast.error('Failed to Update Leverage', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [
    coin,
    getAgentExchangeClient,
    getSymbolConverter,
    isUpdating,
    onLeverageChange,
    onOpenChange,
    selectedLeverage,
    selectedMarginMode,
  ]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        {/* Content Container */}
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <YStack
            flex={1}
            backgroundColor="$background"
            borderTopLeftRadius="$6"
            borderTopRightRadius="$6"
            padding="$4"
            gap="$4"
          >
            {/* Handle */}
            <YStack
              opacity={0.5}
              backgroundColor="$gray9"
              height={3}
              width={32}
              alignSelf="center"
              borderRadius="$12"
            />

            {/* Header */}
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
                Adjust Leverage
              </Text>
              <XStack
                width="$2"
                height="$2"
                alignItems="center"
                justifyContent="center"
                onPress={() => onOpenChange(false)}
                pressStyle={{ opacity: 0.5 }}
              >
                <Text fontSize="$5" color="$gray11">
                  ×
                </Text>
              </XStack>
            </XStack>

            {/* Margin Mode Selector */}
            <YStack gap="$2">
              <Text fontFamily="$interRegular" fontSize="$3" color="$gray11">
                Margin Mode
              </Text>
              <XStack gap="$2">
                <Button
                  flex={1}
                  backgroundColor={selectedMarginMode === 'Cross' ? '$accent9' : 'transparent'}
                  borderColor={selectedMarginMode === 'Cross' ? '$accent9' : '$gray8'}
                  borderWidth={1}
                  paddingVertical="$2.5"
                  onPress={() => handleMarginModeChange('Cross')}
                  borderRadius="$3"
                  height="$3"
                  disabled={isUpdating}
                  opacity={isUpdating ? 0.5 : 1}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    fontSize="$3"
                    color={selectedMarginMode === 'Cross' ? '$accent1' : '$color'}
                  >
                    Cross
                  </Text>
                </Button>
                <Button
                  flex={1}
                  backgroundColor={selectedMarginMode === 'Isolated' ? '$accent9' : 'transparent'}
                  borderColor={selectedMarginMode === 'Isolated' ? '$accent9' : '$gray8'}
                  borderWidth={1}
                  paddingVertical="$2.5"
                  onPress={() => handleMarginModeChange('Isolated')}
                  borderRadius="$3"
                  height="$3"
                  disabled={isUpdating}
                  opacity={isUpdating ? 0.5 : 1}
                >
                  <Text
                    fontFamily="$interSemiBold"
                    fontSize="$3"
                    color={selectedMarginMode === 'Isolated' ? '$accent1' : '$color'}
                  >
                    Isolated
                  </Text>
                </Button>
              </XStack>
            </YStack>

            {/* Leverage Adjuster */}
            <YStack gap="$3">
              {/* Leverage Display with Step Buttons */}
              <XStack alignItems="center" justifyContent="center" gap="$4">
                <XStack
                  width="$3"
                  height="$3"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$gray5"
                  borderRadius="$2"
                  onPress={() => {
                    if (!isUpdating) {
                      setSelectedLeverage(Math.max(LEVERAGE_MIN, selectedLeverage - 1));
                    }
                  }}
                  pressStyle={{ opacity: 0.7 }}
                  opacity={isUpdating ? 0.5 : 1}
                >
                  <Text fontSize="$5" color="$color">
                    −
                  </Text>
                </XStack>
                <Text fontFamily="$interBold" fontSize="$8" color="$color">
                  {selectedLeverage}x
                </Text>
                <XStack
                  width="$3"
                  height="$3"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$gray5"
                  borderRadius="$2"
                  onPress={() => {
                    if (!isUpdating) {
                      setSelectedLeverage(Math.min(LEVERAGE_MAX, selectedLeverage + 1));
                    }
                  }}
                  pressStyle={{ opacity: 0.7 }}
                  opacity={isUpdating ? 0.5 : 1}
                >
                  <Text fontSize="$5" color="$color">
                    +
                  </Text>
                </XStack>
              </XStack>

              {/* Leverage Slider */}
              <Slider
                value={[selectedLeverage]}
                min={LEVERAGE_MIN}
                max={LEVERAGE_MAX}
                step={LEVERAGE_STEP}
                disabled={isUpdating}
                onValueChange={values => {
                  if (isUpdating) return;
                  const [next] = values;
                  if (typeof next !== 'number') {
                    return;
                  }
                  const clampedValue = Math.max(
                    LEVERAGE_MIN,
                    Math.min(LEVERAGE_MAX, Math.round(next)),
                  );
                  setSelectedLeverage(clampedValue);
                }}
              >
                <Slider.Track backgroundColor="$gray5" height="$0.5">
                  <Slider.TrackActive backgroundColor="$accent9" />
                </Slider.Track>
                <Slider.Thumb
                  index={0}
                  size="$1.5"
                  backgroundColor="$accent1"
                  borderWidth={2}
                  borderColor="$accent9"
                  circular
                />
              </Slider>

              {/* Leverage Dots Selector */}
              <XStack justifyContent="space-between" paddingHorizontal="$1">
                {Array.from(
                  { length: LEVERAGE_MAX - LEVERAGE_MIN + 1 },
                  (_, i) => i + LEVERAGE_MIN,
                ).map(lev => (
                  <XStack
                    key={lev}
                    width="$0.75"
                    height="$0.75"
                    backgroundColor={selectedLeverage === lev ? '$accent9' : '$gray8'}
                    borderRadius="$10"
                    onPress={() => {
                      if (!isUpdating) {
                        setSelectedLeverage(lev);
                      }
                    }}
                    pressStyle={{ opacity: 0.7 }}
                    opacity={isUpdating ? 0.5 : 1}
                  />
                ))}
              </XStack>
            </YStack>

            {/* Warning Text */}
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10" textAlign="center">
              * Placing high leverage increases your liquidation risk. Always manage your risk by
              monitoring your positions closely.
            </Text>

            {/* Confirm Button */}
            <Button
              width="100%"
              height="$4"
              backgroundColor="$accent9"
              borderColor="$accent9"
              borderWidth={1}
              borderRadius="$3"
              paddingVertical="$3"
              onPress={handleConfirm}
              disabled={isUpdating}
              opacity={isUpdating ? 0.7 : 1}
              pressStyle={{ opacity: 0.8 }}
            >
              {isUpdating ? (
                <Spinner size="small" color="$accent1" />
              ) : (
                <Text fontFamily="$interSemiBold" fontSize="$4" color="$accent1">
                  Confirm
                </Text>
              )}
            </Button>
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
    height: '55%',
    width: '100%',
  },
});
