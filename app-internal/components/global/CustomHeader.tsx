import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

export interface CustomHeaderProps {
  /**
   * Title to display in the header
   */
  title: string;

  /**
   * Custom action for back button press
   * If not provided, will use router.back()
   */
  onBackPress?: () => void;

  /**
   * Whether to show the back button
   * @default true
   */
  showBackButton?: boolean;

  /**
   * Additional styles for the header container
   */
  style?: any;
}

/**
 * CustomHeader component
 *
 * Provides a consistent header for modal screens with title and back button.
 *
 * @example
 * // Basic usage with title
 * <CustomHeader title="Deposit USDC" />
 *
 * // With subtitle
 * <CustomHeader title="Withdraw USDC" subtitle="to arbitrum" />
 *
 * // With custom back action
 * <CustomHeader title="Settings" onBackPress={() => handleCustomBack()} />
 */
export function CustomHeader({
  title,
  onBackPress,
  showBackButton = true,
  style,
}: CustomHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <XStack
      alignItems="center"
      paddingHorizontal="$4"
      paddingVertical="$3"
      style={style}
      position="relative"
    >
      {/* Back button positioned absolutely on the left */}
      {showBackButton && (
        <Pressable
          onPress={handleBackPress}
          style={{ padding: 4, position: 'absolute', left: 16, zIndex: 1 }}
        >
          <Text fontSize="$4" color="$accent9">
            Back
          </Text>
        </Pressable>
      )}

      {/* Title and subtitle always centered */}
      <XStack flex={1} justifyContent="center" alignItems="center">
        <YStack alignItems="center">
          <Text
            fontFamily="$interSemiBold"
            fontSize="$3"
            color="$color12"
            fontWeight="500"
            textAlign="center"
          >
            {title}
          </Text>
        </YStack>
      </XStack>
    </XStack>
  );
}
