import { Button, Sheet, Slider, Text, XStack, YStack } from 'tamagui';

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
}

export function LeverageAdjustmentModal({
  open,
  onOpenChange,
  leverage,
  onLeverageChange,
  marginMode,
  onMarginModeChange,
}: LeverageAdjustmentModalProps) {
  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPointsMode="percent"
      snapPoints={[55]}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay
        animation="quick"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0, 0, 0, 0.7)"
      />
      <Sheet.Handle />
      <Sheet.Frame
        padding="$4"
        gap="$4"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
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
              backgroundColor={marginMode === 'Cross' ? '$accent9' : 'transparent'}
              borderColor={marginMode === 'Cross' ? '$accent9' : '$gray8'}
              borderWidth={1}
              paddingVertical="$2.5"
              onPress={() => onMarginModeChange('Cross')}
              borderRadius="$3"
              height="$3"
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={marginMode === 'Cross' ? '$accent1' : '$color'}
              >
                Cross
              </Text>
            </Button>
            <Button
              flex={1}
              backgroundColor={marginMode === 'Isolated' ? '$accent9' : 'transparent'}
              borderColor={marginMode === 'Isolated' ? '$accent9' : '$gray8'}
              borderWidth={1}
              paddingVertical="$2.5"
              onPress={() => onMarginModeChange('Isolated')}
              borderRadius="$3"
              height="$3"
            >
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={marginMode === 'Isolated' ? '$accent1' : '$color'}
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
              onPress={() => onLeverageChange(Math.max(LEVERAGE_MIN, leverage - 1))}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontSize="$5" color="$color">
                −
              </Text>
            </XStack>
            <Text fontFamily="$interBold" fontSize="$8" color="$color">
              {leverage}x
            </Text>
            <XStack
              width="$3"
              height="$3"
              alignItems="center"
              justifyContent="center"
              backgroundColor="$gray5"
              borderRadius="$2"
              onPress={() => onLeverageChange(Math.min(LEVERAGE_MAX, leverage + 1))}
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontSize="$5" color="$color">
                +
              </Text>
            </XStack>
          </XStack>

          {/* Leverage Slider */}
          <Slider
            value={[leverage]}
            min={LEVERAGE_MIN}
            max={LEVERAGE_MAX}
            step={LEVERAGE_STEP}
            onValueChange={values => {
              const [next] = values;
              if (typeof next !== 'number') {
                return;
              }
              const clampedValue = Math.max(LEVERAGE_MIN, Math.min(LEVERAGE_MAX, Math.round(next)));
              onLeverageChange(clampedValue);
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
                backgroundColor={leverage === lev ? '$accent9' : '$gray8'}
                borderRadius="$10"
                onPress={() => onLeverageChange(lev)}
                pressStyle={{ opacity: 0.7 }}
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
          onPress={() => onOpenChange(false)}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontFamily="$interSemiBold" fontSize="$4" color="$accent1">
            Confirm
          </Text>
        </Button>
      </Sheet.Frame>
    </Sheet>
  );
}
