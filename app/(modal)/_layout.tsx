import { Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

/**
 * Modal Layout
 *
 * Responsibility: Provide safe area handling for full-screen modal-like pages
 * This layout wraps pages like settings, deposit, withdraw that are shown
 * over the tabs and need to respect safe area insets.
 */
export default function ModalLayout() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Top safe area */}
      <YStack height={insets.top} backgroundColor="$background" />

      {/* Page content */}
      <YStack flex={1}>
        <Slot />
      </YStack>

      {/* Bottom safe area */}
      <YStack height={insets.bottom} backgroundColor="$background" />
    </YStack>
  );
}
