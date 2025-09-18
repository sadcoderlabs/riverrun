/**
 * Heading components for consistent typography.
 * Provides a set of heading elements (H1-H6) with predefined sizes and styles.
 *
 * @example
 * // Using individual heading components
 * <H1>Page Title</H1>
 * <H2>Section Title</H2>
 * <H3>Subsection Title</H3>
 *
 * // Using the Heading namespace
 * <Heading.H1>Page Title</Heading.H1>
 * <Heading.H2>Section Title</Heading.H2>
 *
 * @note This component follows platform-specific UI guidelines and has a corresponding .ios.tsx implementation
 * which Expo Router will automatically select on iOS devices.
 */

import {
  H1 as TamaguiH1,
  H2 as TamaguiH2,
  H3 as TamaguiH3,
  H4 as TamaguiH4,
  H5 as TamaguiH5,
  H6 as TamaguiH6,
  styled,
  TamaguiTextElement,
} from "tamagui"
import React, { forwardRef } from "react"

// Define prop types
import type { TextProps } from "tamagui"

/**
 * H1 - Largest heading (Size 8)
 * Used for main page titles
 */
const StyledH1 = styled(TamaguiH1, {
  fontFamily: "$interBold",
  fontSize: "$8",
  fontWeight: "$7",
})

const HeadingH1 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH1 {...props} ref={ref} />
})
HeadingH1.displayName = "HeadingH1"

/**
 * H2 - Second level heading (Size 7)
 * Used for major section headings
 */
const StyledH2 = styled(TamaguiH2, {
  fontFamily: "$interBold",
  fontSize: "$7",
  fontWeight: "$7",
})

const HeadingH2 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH2 {...props} ref={ref} />
})
HeadingH2.displayName = "HeadingH2"

/**
 * H3 - Third level heading (Size 6)
 * Used for subsection headings
 */
const StyledH3 = styled(TamaguiH3, {
  fontFamily: "$interBold",
  fontSize: "$6",
  fontWeight: "$7",
})

const HeadingH3 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH3 {...props} ref={ref} />
})
HeadingH3.displayName = "HeadingH3"

/**
 * H4 - Fourth level heading (Size 5)
 * Used for minor section headings
 */
const StyledH4 = styled(TamaguiH4, {
  fontFamily: "$interBold",
  fontSize: "$5",
  fontWeight: "$7",
})

const HeadingH4 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH4 {...props} ref={ref} />
})
HeadingH4.displayName = "HeadingH4"

/**
 * H5 - Fifth level heading (Size 4)
 * Used for small headings or emphasized content
 */
const StyledH5 = styled(TamaguiH5, {
  fontFamily: "$interSemiBold",
  fontSize: "$4",
  fontWeight: "$6",
})

const HeadingH5 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH5 {...props} ref={ref} />
})
HeadingH5.displayName = "HeadingH5"

/**
 * H6 - Smallest heading (Size 3)
 * Used for the smallest level of headings
 */
const StyledH6 = styled(TamaguiH6, {
  fontFamily: "$interSemiBold",
  fontSize: "$3",
  fontWeight: "$6",
})

const HeadingH6 = forwardRef<TamaguiTextElement, TextProps>((props, ref) => {
  return <StyledH6 {...props} ref={ref} />
})
HeadingH6.displayName = "HeadingH6"

/**
 * Individual heading components for direct import/usage
 * Each component corresponds to the HTML heading elements with consistent styling
 */
export const H1 = HeadingH1
export const H2 = HeadingH2
export const H3 = HeadingH3
export const H4 = HeadingH4
export const H5 = HeadingH5
export const H6 = HeadingH6

/**
 * Heading namespace that contains all heading components
 * Provides a unified API for accessing all heading levels
 *
 * Heading sizes:
 * - H1: Size 8 (largest)
 * - H2: Size 7
 * - H3: Size 6
 * - H4: Size 5
 * - H5: Size 4
 * - H6: Size 3 (smallest)
 */
export const Heading = {
  Heading: HeadingH1,
  H1: HeadingH1,
  H2: HeadingH2,
  H3: HeadingH3,
  H4: HeadingH4,
  H5: HeadingH5,
  H6: HeadingH6,
}

/**
 * Type definitions for heading component props
 * All heading components use the standard Tamagui TextProps
 */
export type H1Props = TextProps
export type H2Props = TextProps
export type H3Props = TextProps
export type H4Props = TextProps
export type H5Props = TextProps
export type H6Props = TextProps
