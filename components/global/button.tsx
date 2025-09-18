/**
 * Button component with multiple variants.
 * Provides consistent button styling across the application with base, filled, tinted, and gray variants.
 *
 * @example
 * // Basic usage (text-only button)
 * <Button onPress={handlePress}>Press Me</Button>
 *
 * // Filled variant (solid background)
 * <Button.Filled onPress={handlePress}>Primary Action</Button.Filled>
 *
 * // Tinted variant (lighter background with accent color)
 * <Button.Tinted onPress={handlePress}>Secondary Action</Button.Tinted>
 *
 * // Gray variant (neutral background with accent color)
 * <Button.Gray onPress={handlePress}>Tertiary Action</Button.Gray>
 *
 * // With disabled state
 * <Button disabled={isLoading}>Submit</Button>
 *
 * @note This component follows platform-specific UI guidelines and has a corresponding .ios.tsx implementation
 * which Expo Router will automatically select on iOS devices.
 */

import React, { forwardRef } from 'react';
import {
  styled,
  Button as TamaguiButton,
  ButtonProps as TamaguiButtonProps,
  TamaguiElement,
} from 'tamagui';

/**
 * Base Button - Text-only button with transparent background
 * Used for low-emphasis actions
 */
const StyledBaseButton = styled(TamaguiButton, {
  fontWeight: '$5',
  pressTheme: true,
  rounded: '$12',
  bg: 'transparent',
  color: '$accent9',
  chromeless: true,
  borderWidth: 0,
  outlineWidth: 0,
  pressStyle: {
    bg: '$backgroundHover',
    outlineWidth: 0,
    opacity: 0.8,
  },
  hoverStyle: {
    bg: '$backgroundHover',
    outlineWidth: 0,
  },
  size: '$3',
  height: '$3.5',
  px: '$3',
  variants: {
    level: {
      sm: { fontSize: '$3', size: '$3', height: '$3', px: '$3', py: '$0' },
      md: { fontSize: '$3', size: '$3', height: '$4', px: '$5', py: '$0.5' },
      lg: { fontSize: '$4', size: '$4', height: '$5', px: '$6', py: '$1' },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  },
});

// Use styleable for functional components that wrap styled components
const ButtonBase = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledBaseButton {...props} ref={ref} />;
});
ButtonBase.displayName = 'ButtonBase';

/**
 * Filled Button - Primary action button with solid background
 * Used for high-emphasis, primary actions
 */
const StyledTintedButton = styled(TamaguiButton, {
  fontWeight: '$5',
  color: '$accent11',
  borderWidth: 0,
  bg: '$accent3',
  rounded: '$12',
  theme: 'accent',
  size: '$3',
  height: '$3.5',
  px: '$5',
  variants: {
    level: {
      sm: { fontSize: '$3', size: '$3', height: '$3', px: '$3', py: '$0' },
      md: { fontSize: '$3', size: '$3', height: '$4', px: '$5', py: '$0.5' },
      lg: { fontSize: '$4', size: '$4', height: '$5', px: '$6', py: '$1' },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  },
});

const ButtonFilled = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledFilledButton {...props} ref={ref} />;
});
ButtonFilled.displayName = 'ButtonFilled';

/**
 * Tinted Button - Secondary action button with light accent background
 * Used for medium-emphasis actions
 */
const StyledFilledButton = styled(TamaguiButton, {
  fontWeight: '$5',
  rounded: '$12',
  color: '$accent1',
  bg: '$accent9',
  borderWidth: 0,
  outlineWidth: 0,
  hoverStyle: {
    bg: '$accent9',
    opacity: 0.9,
  },
  pressStyle: {
    bg: '$accent11',
    opacity: 0.8,
  },
  size: '$3',
  height: '$3.5',
  px: '$5',
  variants: {
    level: {
      sm: { fontSize: '$3', size: '$3', height: '$3', px: '$3', py: '$0' },
      md: { fontSize: '$3', size: '$3', height: '$4', px: '$5', py: '$0.5' },
      lg: { fontSize: '$4', size: '$4', height: '$5', px: '$6', py: '$1' },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  },
});

const ButtonTinted = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledTintedButton {...props} ref={ref} />;
});
ButtonTinted.displayName = 'ButtonTinted';

/**
 * Gray Button - Outlined button with neutral styling
 * Used for tertiary actions or in contexts where a less prominent button is needed
 */
const StyledGrayButton = styled(TamaguiButton, {
  fontWeight: '$5',
  rounded: '$12',
  variant: 'outlined',
  borderWidth: 1,
  color: '$accent9',
  size: '$3',
  height: '$3.5',
  px: '$5',
  variants: {
    level: {
      sm: { fontSize: '$3', size: '$3', height: '$3', px: '$3', py: '$0' },
      md: { fontSize: '$3', size: '$3', height: '$4', px: '$5', py: '$0.5' },
      lg: { fontSize: '$4', size: '$4', height: '$5', px: '$6', py: '$1' },
    },
    disabled: {
      true: {
        opacity: 0.75,
      },
    },
  },
});

const ButtonGray = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledGrayButton {...props} ref={ref} />;
});
ButtonGray.displayName = 'ButtonGray';

/**
 * Inline Button - Text-only button with transparent background, same as base button
 * Used for inline text links or actions that should appear within text
 */
// Inline Button - same as base button but for inline use
const StyledInlineButton = styled(TamaguiButton, {
  unstyled: true,
  pressTheme: true,
  pressStyle: {
    opacity: 0.8,
    bg: 'transparent',
  },
  fontSize: '$4',
  fontWeight: '$5',
  color: '$accent9',
  variants: {
    level: {
      sm: { fontSize: '$3' },
      md: { fontSize: '$4' },
      lg: { fontSize: '$5' },
    },
  } as const,
  defaultVariants: {
    level: 'md',
  },
});

const ButtonInline = forwardRef<TamaguiElement, ButtonProps>((props, ref) => {
  return <StyledInlineButton {...props} ref={ref} />;
});
ButtonInline.displayName = 'ButtonInline';

/**
 * Unified Button component with multiple variants.
 *
 * Variants:
 * - Button (default): Text-only button with transparent background
 * - Button.Filled: Primary action button with solid background
 * - Button.Tinted: Secondary action button with light accent background
 * - Button.Gray: Outlined button with neutral styling
 * - Button.Inline: Text-only button with transparent background (same as base but for inline use)
 */
export const Button = Object.assign(ButtonBase, {
  Filled: ButtonFilled,
  Tinted: ButtonTinted,
  Gray: ButtonGray,
  Inline: ButtonInline,
}) as typeof ButtonBase & {
  Filled: typeof ButtonFilled;
  Tinted: typeof ButtonTinted;
  Gray: typeof ButtonGray;
  Inline: typeof ButtonInline;
};

/**
 * Custom ButtonProps interface extending TamaguiButtonProps.
 *
 * @property level - Controls the size/padding of the button (sm, md, lg)
 */
export interface ButtonProps extends TamaguiButtonProps {
  level?: 'sm' | 'md' | 'lg';
}
