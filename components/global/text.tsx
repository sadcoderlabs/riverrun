/**
 * Standard Text component built on Tamagui's SizableText.
 * Provides consistent text styling across the application with predefined sizes and weights.
 *
 * The base Text component uses size 4 (Body) by default.
 *
 * @example
 * // Basic usage
 * <Text>Regular body text</Text>
 *
 * // Using variants
 * <Text.Caption>Small caption text</Text.Caption>
 * <Text.Footnote>Footnote text</Text.Footnote>
 * <Text.Subhead>Subheading text</Text.Subhead>
 *
 * @note This component follows the platform-specific UI guidelines and has a corresponding .ios.tsx implementation
 * which Expo Router will automatically select on iOS devices.
 */

import { SizableText as TamaguiText, styled, TamaguiTextElement } from "tamagui"
import React, { forwardRef } from "react"

// Define prop types upfront
import type { TextProps as TamaguiTextProps } from "tamagui"
export type TextProps = TamaguiTextProps

// Text - Size 4 (Body)
const StyledText = styled(TamaguiText, {
  fontFamily: "$interRegular",
  fontSize: "$4",
  fontWeight: "$4",
  lineHeight: "$4",
})

const TextBase = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledText {...props} ref={ref} />
})
TextBase.displayName = "TextBase"

// Text.Caption - Size 1
const StyledCaption = styled(TamaguiText, {
  fontFamily: "$interRegular",
  fontSize: "$1",
  lineHeight: "$1",
  fontWeight: "$4",
})

const TextCaption = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledCaption {...props} ref={ref} />
})
TextCaption.displayName = "TextCaption"

// Text.Footnote - Size 2
const StyledFootnote = styled(TamaguiText, {
  fontFamily: "$interRegular",
  fontSize: "$2",
  lineHeight: "$2",
  fontWeight: "$4",
  color: "$color06",
})

const TextFootnote = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledFootnote {...props} ref={ref} />
})
TextFootnote.displayName = "TextFootnote"

// Text.Subhead - Size 3
const StyledSubhead = styled(TamaguiText, {
  fontFamily: "$interRegular",
  fontSize: "$3",
  lineHeight: "$3",
  fontWeight: "$4",
})

const TextSubhead = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledSubhead {...props} ref={ref} />
})
TextSubhead.displayName = "TextSubhead"

/**
 * Text component with predefined variants for different text sizes.
 *
 * Variants:
 * - Text (default): Standard body text (size 4)
 * - Text.Caption: Smallest text size (size 1)
 * - Text.Footnote: Small text (size 2)
 * - Text.Subhead: Medium text (size 3)
 */
export const Text = Object.assign(TextBase, {
  Caption: TextCaption,
  Footnote: TextFootnote,
  Subhead: TextSubhead,
})
