import { useMarginLeverage } from '@/lib/riverrun/margin/useMarginLeverage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Button, Slider, Spinner, Text, XStack, YStack } from 'tamagui';

const LEVERAGE_STEP = 1;

interface LeverageAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeverageAdjustmentModal({ open, onOpenChange }: LeverageAdjustmentModalProps) {
  // Get real-time margin and leverage data, and update function (hybrid strategy)
  const { marginLeverage, setMarginLeverage, isUpdating, isLoading } = useMarginLeverage();

  // Extract min/max leverage from marginLeverage (safe defaults for initialization)
  const leverageMin = marginLeverage?.minLeverage ?? 1;
  const leverageMax = marginLeverage?.maxLeverage ?? 20;

  // Local state to track user's selection before confirming
  const [selectedLeverage, setSelectedLeverage] = useState(marginLeverage?.leverage ?? 5);
  const [selectedMarginMode, setSelectedMarginMode] = useState<'isolated' | 'cross'>(
    marginLeverage?.marginMode ?? 'isolated',
  );

  // Sync local state with current margin/leverage when modal opens
  useEffect(() => {
    if (open && marginLeverage) {
      // Clamp the leverage to the valid range
      const clampedLeverage = Math.max(
        marginLeverage.minLeverage,
        Math.min(marginLeverage.maxLeverage, marginLeverage.leverage),
      );
      setSelectedLeverage(clampedLeverage);
      setSelectedMarginMode(marginLeverage.marginMode);
    }
  }, [open, marginLeverage]);

  // Handle margin mode change - immediately call API
  const handleMarginModeChange = useCallback(
    async (newMode: 'Cross' | 'Isolated') => {
      if (isUpdating) return;

      const marginMode: 'isolated' | 'cross' = newMode === 'Cross' ? 'cross' : 'isolated';

      // Update via hook (handles all API logic, error handling, and toasts)
      await setMarginLeverage({
        leverage: selectedLeverage,
        marginMode,
      });

      // Update local state (WebSocket will update the hook's data)
      setSelectedMarginMode(marginMode);
    },
    [isUpdating, selectedLeverage, setMarginLeverage],
  );

  // Handle leverage confirmation - call API on confirm button
  const handleConfirm = useCallback(async () => {
    if (isUpdating) return;

    // Update via hook (handles all API logic, error handling, and toasts)
    await setMarginLeverage({
      leverage: selectedLeverage,
      marginMode: selectedMarginMode,
    });

    // Close modal on success
    onOpenChange(false);
  }, [isUpdating, onOpenChange, selectedLeverage, selectedMarginMode, setMarginLeverage]);

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

            {/* Loading State */}
            {(isLoading || !marginLeverage) && (
              <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
                <Spinner size="large" color="$accent9" />
                <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
                  Loading leverage data...
                </Text>
              </YStack>
            )}

            {/* Content - only show when data is loaded */}
            {!isLoading && marginLeverage && (
              <>
                {/* Margin Mode Selector */}
                <YStack gap="$2">
                  <Text fontFamily="$interRegular" fontSize="$3" color="$gray11">
                    Margin Mode
                  </Text>
                  <XStack gap="$2">
                    <Button
                      flex={1}
                      backgroundColor={selectedMarginMode === 'cross' ? '$accent9' : 'transparent'}
                      borderColor={selectedMarginMode === 'cross' ? '$accent9' : '$gray8'}
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
                        color={selectedMarginMode === 'cross' ? '$accent1' : '$color'}
                      >
                        Cross
                      </Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor={
                        selectedMarginMode === 'isolated' ? '$accent9' : 'transparent'
                      }
                      borderColor={selectedMarginMode === 'isolated' ? '$accent9' : '$gray8'}
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
                        color={selectedMarginMode === 'isolated' ? '$accent1' : '$color'}
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
                          setSelectedLeverage(Math.max(leverageMin, selectedLeverage - 1));
                        }
                      }}
                      pressStyle={{ opacity: 0.7 }}
                      opacity={isUpdating || selectedLeverage <= leverageMin ? 0.5 : 1}
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
                          setSelectedLeverage(Math.min(leverageMax, selectedLeverage + 1));
                        }
                      }}
                      pressStyle={{ opacity: 0.7 }}
                      opacity={isUpdating || selectedLeverage >= leverageMax ? 0.5 : 1}
                    >
                      <Text fontSize="$5" color="$color">
                        +
                      </Text>
                    </XStack>
                  </XStack>

                  {/* Leverage Range Info */}
                  <XStack justifyContent="center" alignItems="center" gap="$2">
                    <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                      Available Range:
                    </Text>
                    <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
                      {leverageMin}x - {leverageMax}x
                    </Text>
                  </XStack>

                  {/* Leverage Slider */}
                  <Slider
                    value={[selectedLeverage]}
                    min={leverageMin}
                    max={leverageMax}
                    step={LEVERAGE_STEP}
                    disabled={isUpdating}
                    onValueChange={values => {
                      if (isUpdating) return;
                      const [next] = values;
                      if (typeof next !== 'number') {
                        return;
                      }
                      const clampedValue = Math.max(
                        leverageMin,
                        Math.min(leverageMax, Math.round(next)),
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
                </YStack>

                {/* Warning Text */}
                <Text fontFamily="$interRegular" fontSize="$2" color="$gray10" textAlign="center">
                  * Placing high leverage increases your liquidation risk. Always manage your risk
                  by monitoring your positions closely.
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
              </>
            )}
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
