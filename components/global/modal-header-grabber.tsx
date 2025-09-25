/**
 * ModalHeader component.
 * Provides a consistent header for modal screens with title, optional back button, and close button.
 *
 * @example
 * // Basic usage with title
 * <ModalHeader title="Add Card" />
 *
 * // With custom close action
 * <ModalHeader title="Settings" onClosePress={() => handleCustomClose()} />
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View, XStack } from 'tamagui';
import { CloseButton } from './close-button';

export interface ModalHeaderGrabberProps {
  /**
   * Title to display in the header
   */
  title: string;

  /**
   * Custom action for close button press
   * If not provided, will use router.back()
   */
  onClosePress?: () => void;

  /**
   * Additional styles for the header container
   */
  style?: any;
  showBackButton?: boolean;
}

export function ModalHeaderGrabber({
  title,
  onClosePress,
  style,
  showBackButton,
}: ModalHeaderGrabberProps) {
  const router = useRouter();

  const handleClosePress = () => {
    if (onClosePress) {
      onClosePress();
    } else {
      router.back();
    }
  };

  return (
    <XStack
      alignItems="center"
      height={64}
      justifyContent="center"
      alignContent="center"
      px="$5"
      py="$2"
      style={style}
    >
      <XStack position="absolute" left={0} right={0} top={6} justifyContent="center">
        <View rounded={'$11'} bottom={0} bg="$grayA8" width={60} height="$0.5" />
      </XStack>

      <Text fontSize={18} fontWeight={'700'}>
        {title}
      </Text>
      {showBackButton && (
        <View position="absolute" right={12} top={12}>
          <CloseButton onPress={handleClosePress} />
        </View>
      )}
    </XStack>
  );
}
