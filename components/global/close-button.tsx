import { X } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import {
  styled,
  Button as TamaguiButton,
  ButtonProps as TamaguiButtonProps,
  TamaguiElement,
} from 'tamagui';

const StyledCloseButton = styled(TamaguiButton, {
  borderRadius: 100,
  aspectRatio: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: 40,
  height: 40,
  padding: 0,
  margin: 0,
  borderWidth: 0,
  borderColor: 'transparent',
  backgroundColor: 'transparent',
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
        icon={<X size={24} color={inline ? '$color04' : '$color'} />}
        onPress={handlePress}
      />
    );
  },
);

CloseButton.displayName = 'CloseButton';
