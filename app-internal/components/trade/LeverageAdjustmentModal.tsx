import { useMargin, useMarginStore } from '@/app-internal';
import { Button } from '@/app-internal/components/global/Button';
import { Text } from '@/app-internal/components/global/Text';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner-native';
import { Sheet, Slider, Spinner, XStack, YStack } from 'tamagui';

const LEVERAGE_STEP = 1;

interface LeverageAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeverageAdjustmentModal({ open, onOpenChange }: LeverageAdjustmentModalProps) {
  // Get real-time margin and leverage data from margin context
  const marginLeverage = useMarginStore(state => state.marginLeverage);
  const isLoading = useMarginStore(state => state.isLoading);
  const { setMarginLeverage, isUpdating } = useMargin();

  // Extract min/max leverage from marginLeverage (safe defaults for initialization)
  const leverageMin = marginLeverage?.minLeverage ?? 1;
  const leverageMax = marginLeverage?.maxLeverage ?? 20;

  // Local state to track user's selection before confirming
  const [selectedLeverage, setSelectedLeverage] = useState(marginLeverage?.leverage ?? 5);
  const [selectedMarginMode, setSelectedMarginMode] = useState<'isolated' | 'cross'>(
    marginLeverage?.marginMode ?? 'isolated',
  );

  // Sync local state with current margin/leverage when modal opens
  // Intentionally omit marginLeverage from deps to prevent WebSocket updates from overwriting user input
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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle margin mode change - immediately call API
  const handleMarginModeChange = useCallback(
    async (newMode: 'Cross' | 'Isolated') => {
      if (isUpdating) return;

      const marginMode: 'isolated' | 'cross' = newMode === 'Cross' ? 'cross' : 'isolated';

      try {
        await setMarginLeverage({
          leverage: selectedLeverage,
          marginMode,
        });

        // Update local state (WebSocket will update the hook's data)
        setSelectedMarginMode(marginMode);

        toast.success('Margin Mode Updated', {
          description: `Successfully set to ${marginMode}`,
        });
      } catch (error) {
        toast.error('Failed to Update Margin Mode', {
          description: error instanceof Error ? error.message : 'An error occurred',
        });
      }
    },
    [isUpdating, selectedLeverage, setMarginLeverage],
  );

  // Handle leverage confirmation - call API on confirm button
  const handleConfirm = useCallback(async () => {
    if (isUpdating) return;

    try {
      await setMarginLeverage({
        leverage: selectedLeverage,
        marginMode: selectedMarginMode,
      });

      toast.success('Margin and Leverage Updated', {
        description: `Successfully set to ${selectedLeverage}x ${selectedMarginMode}`,
      });

      // Close modal on success
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to Update Margin/Leverage', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }, [isUpdating, onOpenChange, selectedLeverage, selectedMarginMode, setMarginLeverage]);

  return (
    <Sheet
      modal
      native
      open={open}
      onOpenChange={() => onOpenChange(false)}
      snapPoints={[70]}
      position={0}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame
        padding="$2"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        {/* Content Container */}
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
          <Text fontSize="$3" textAlign="center" color="$color12">
            Leverage Picker
          </Text>

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
              {/* Scrollable Content Area */}
              <YStack flex={1} gap="$4">
                {/* Margin Mode Selector Section */}
                <YStack gap="$2">
                  <Text fontSize="$2" color="$gray11">
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
                        fontSize="$3"
                        color={selectedMarginMode === 'isolated' ? '$accent1' : '$color'}
                      >
                        Isolated
                      </Text>
                    </Button>
                  </XStack>
                </YStack>

                {/* Leverage Adjuster Section */}
                <YStack gap="$2" mt="$8">
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
                      <Text fontSize="$4" color="$color">
                        −
                      </Text>
                    </XStack>
                    <XStack width={80} alignItems="center" justifyContent="center">
                      <Text fontFamily="$interBold" fontSize="$6" color="$color">
                        {selectedLeverage}x
                      </Text>
                    </XStack>
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
                      <Text fontSize="$4" color="$color">
                        +
                      </Text>
                    </XStack>
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
                    marginVertical="$4"
                  >
                    <Slider.Track backgroundColor="$gray5" height="$0.75">
                      <Slider.TrackActive backgroundColor="$accent9" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      size="$1"
                      backgroundColor="$accent1"
                      borderWidth={2}
                      borderColor="$accent9"
                      circular
                    />
                  </Slider>
                  {/* Leverage Range Info */}
                  <XStack justifyContent="center" alignItems="center" gap="$2">
                    <Text fontSize="$2" color="$gray10">
                      Available Range:
                    </Text>
                    <Text fontSize="$2" color="$color12">
                      {leverageMin}x - {leverageMax}x
                    </Text>
                  </XStack>
                  {/* Info */}
                  <YStack
                    backgroundColor="$gray2"
                    padding="$3"
                    borderRadius="$3"
                    gap="$1.5"
                    marginTop="$2"
                  >
                    <Text.Caption color="$color10" lineHeight={16}>
                      • Higher leverage increases liquidation risk
                    </Text.Caption>
                    <Text.Caption color="$color10" lineHeight={16}>
                      • Leverage changes apply to your entire position
                    </Text.Caption>
                  </YStack>
                </YStack>
              </YStack>

              {/* Confirm Section - Pinned at Bottom */}
              <YStack gap="$4">
                {/* Confirm Button */}
                <Button
                  width="100%"
                  height="$5"
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
                    <Text fontSize="$4" color="$accent1">
                      Confirm
                    </Text>
                  )}
                </Button>
              </YStack>
            </>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
