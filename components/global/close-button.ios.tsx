import { useRouter } from 'expo-router';
import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import {
  styled,
  Button as TamaguiButton,
  ButtonProps as TamaguiButtonProps,
  TamaguiElement,
} from 'tamagui';

import { X } from '@tamagui/lucide-icons';

const StyledCloseButton = styled(TamaguiButton, {
  borderRadius: 100,
  aspectRatio: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: 32,
  height: 32,
  padding: 0,
  margin: 0,
  borderWidth: 0,
  borderColor: 'transparent',
  backgroundColor: '$grayA3',
  pressStyle: {
    bg: '$grayA5',
    outlineWidth: 0,
    opacity: 0.8,
  },
  variants: {
    inline: {
      true: {
        width: 24,
        height: 24,
        backgroundColor: 'transparent',
      },
    },
  } as const,
});

interface CloseButtonProps extends Omit<React.ComponentProps<typeof StyledCloseButton>, 'onPress'> {
  autoBack?: boolean;
  onPress?: TamaguiButtonProps['onPress'];
}

export const CloseButton = forwardRef<TamaguiElement, CloseButtonProps>(
  ({ autoBack, onPress, inline, ...props }, ref) => {
    const router = useRouter();

    const handlePress = (event: any) => {
      if (autoBack) {
        if (Platform.OS === 'web') {
          router.dismissTo('/');
        } else {
          router.dismiss();
        }
      }
      onPress?.(event);
    };

    return (
      <StyledCloseButton
        {...props}
        inline={inline}
        ref={ref}
        icon={<X color={inline ? '$grayA10' : '$color'} size={14} />}
        onPress={handlePress}
      />
    );
  },
);

CloseButton.displayName = 'CloseButton';
